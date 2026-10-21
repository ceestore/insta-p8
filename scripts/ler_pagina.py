"""Lê a página de um produto (ou qualquer site) com o Crawl4AI e devolve JSON — substitui o FireCrawl.

Uso (no computador: `py` no Windows, `python3` no Linux/Mac):
    py scripts/ler_pagina.py <url>                                   JSON no terminal
    py scripts/ler_pagina.py <url> --saida produto.json              JSON num arquivo
    py scripts/ler_pagina.py <url> --baixar-fotos pasta/ --max-fotos 8   também baixa as fotos da galeria
    py scripts/ler_pagina.py <url> --max-chars 20000                 texto (markdown) maior (padrão 12000)
    py scripts/ler_pagina.py <url> --cdp http://localhost:9222       usa um Chrome já aberto (com --remote-debugging-port)

Instalação (uma vez):
    py -m pip install -U crawl4ai
    crawl4ai-setup          (baixa o navegador que o Crawl4AI usa)

Saída: { ok, url, final_url, status, title, description, product (JSON-LD de produto, quando a loja publica),
         images: [{src, alt}], markdown, error }. O Claude lê o markdown e tira título, tópicos, ficha técnica,
nota e preço — nada de chave de API nem créditos.

Regras de uso (ver as skills): Amazon só página a página, nos links que o dono mandou (nada de varrer listas);
fotos da Amazon não vão para os posts de afiliado. Se a página vier bloqueada (captcha, "robot check", vazia),
o script avisa em "error" e o Claude pede ao dono o texto do anúncio ou usa o Chrome dele.
"""

import argparse
import asyncio
import json
import os
import re
import sys
import urllib.request
from html import unescape
from urllib.parse import urljoin, urlparse

os.environ.setdefault("CRAWL4AI_NO_CLOUD_NOTICE", "1")
try:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig
except ImportError:
    sys.exit("Crawl4AI não instalado. Rode: py -m pip install -U crawl4ai  e depois  crawl4ai-setup")

BLOCKED = re.compile(r"captcha|robot check|digite os caracteres|are you a human|access denied|acesso negado", re.I)
# Product area of the stores we use, so the text starts at the listing instead of the site menu.
TARGETS = {
    "amazon.": ["#centerCol", "#feature-bullets", "#productDescription", "#aplus", "#productOverview_feature_div",
                "#productDetails_feature_div", "#detailBullets_feature_div", "#averageCustomerReviews"],
    "mercadolivre.": [".ui-pdp-container", ".ui-pdp-description", ".ui-vpp-highlighted-specs", ".ui-pdp-specs"],
    "mercadolibre.": [".ui-pdp-container", ".ui-pdp-description"],
}
# Noise inside those areas (installment tables, pop-ups).
EXCLUDE = {
    "amazon.": "#installmentCalculatorCentral_feature_div, #installmentPaymentPrice_feature_div, .a-popover-preload, "
               "#InstallmentCalculatorTableCredit, #InstallmentCalculatorTableNubankCredit",
}
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"


def meta(html: str, name: str) -> str:
    m = re.search(rf'<meta[^>]+(?:property|name)=["\']{re.escape(name)}["\'][^>]*content=["\']([^"\']*)', html, re.I)
    if not m:
        m = re.search(rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']{re.escape(name)}["\']', html, re.I)
    return unescape(m.group(1)).strip() if m else ""


def json_ld_product(html: str):
    """First schema.org Product published by the page (Mercado Livre, Shopee and most stores do)."""
    for block in re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', html, re.S | re.I):
        try:
            data = json.loads(block.strip())
        except ValueError:
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            item = stack.pop(0)
            if not isinstance(item, dict):
                continue
            kind = item.get("@type")
            if kind == "Product" or (isinstance(kind, list) and "Product" in kind):
                return item
            stack.extend(item.get("@graph") or [])
    return None


def gallery(html: str, base: str, media) -> list:
    """Product photos in the best resolution found: Amazon hiRes, JSON-LD/og images, then the largest page images."""
    found = []
    found += re.findall(r'"hiRes":"(https://[^"]+)"', html)  # Amazon gallery (colorImages)
    found += [u.replace("\\/", "/") for u in re.findall(r'"(https?:\\?/\\?/http2\.mlstatic\.com[^"]+?-O\.(?:jpg|webp))"', html)]  # Mercado Livre
    og = meta(html, "og:image")
    if og:
        found.append(og)
    for img in (media or {}).get("images", []):
        src = img.get("src") or ""
        if src and (img.get("score") or 0) >= 3:
            found.append(src)
    out, seen = [], set()
    for src in found:
        src = urljoin(base, unescape(src))
        key = re.sub(r"\._[^/]*_\.", ".", src)  # same Amazon photo in other sizes
        if src.startswith("http") and key not in seen:
            seen.add(key)
            out.append(src)
    return out


def download(urls: list, folder: str, limit: int) -> list:
    os.makedirs(folder, exist_ok=True)
    saved = []
    for i, url in enumerate(urls[:limit], 1):
        ext = os.path.splitext(urlparse(url).path)[1].lower()
        ext = ext if ext in (".jpg", ".jpeg", ".png", ".webp") else ".jpg"
        path = os.path.join(folder, f"foto-{i}{ext}")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as res, open(path, "wb") as fh:
                fh.write(res.read())
            saved.append(path)
        except Exception as exc:  # one bad photo should not stop the others
            print(f"aviso: não baixei {url}: {exc}", file=sys.stderr)
    return saved


def pick(table: dict, url: str):
    host = urlparse(url).netloc or url[:200]
    return next((v for k, v in table.items() if k in host), None)


async def read(url: str, max_chars: int, cdp: str = None) -> dict:
    if cdp:
        browser = BrowserConfig(browser_mode="cdp", cdp_url=cdp, ignore_https_errors=False, verbose=False)
    else:
        browser = BrowserConfig(headless=True, user_agent=UA, ignore_https_errors=False, verbose=False)
    run = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        wait_until="domcontentloaded",
        page_timeout=60000,
        delay_before_return_html=2.0,
        magic=True,
        remove_overlay_elements=True,
        excluded_tags=["nav", "footer", "script", "style"],
        excluded_selector=pick(EXCLUDE, url),
        target_elements=pick(TARGETS, url),
        verbose=False,
    )
    async with AsyncWebCrawler(config=browser) as crawler:
        result = await crawler.arun(url=url, config=run)
    html = result.html or ""
    markdown = str(getattr(result.markdown, "raw_markdown", result.markdown) or "")
    final_url = getattr(result, "redirected_url", None) or result.url or url
    out = {
        "ok": bool(result.success),
        "url": url,
        "final_url": final_url,
        "status": result.status_code,
        "title": meta(html, "og:title") or (re.search(r"<title>(.*?)</title>", html, re.S | re.I) or [None, ""])[1].strip(),
        "description": meta(html, "og:description") or meta(html, "description"),
        "product": json_ld_product(html),
        "images": gallery(html, final_url, result.media),
        "markdown": markdown[:max_chars],
        "error": result.error_message or None,
    }
    net = re.search(r"net::ERR_[A-Z_]+", out["error"] or "")
    if net:
        out["error"] = f"O navegador não conseguiu abrir a página ({net.group(0)}). Confira o link e a internet; se persistir, use o Chrome do dono."
    if out["ok"] and (len(markdown) < 300 or BLOCKED.search(markdown[:3000])):
        out["ok"] = False
        out["error"] = "Página bloqueada ou vazia (captcha/robô). Peça ao dono o texto do anúncio ou use o Chrome dele."
    return out


def main():
    ap = argparse.ArgumentParser(description="Lê uma página com o Crawl4AI e devolve JSON.")
    ap.add_argument("url")
    ap.add_argument("--saida", help="grava o JSON neste arquivo")
    ap.add_argument("--max-chars", type=int, default=12000, help="tamanho máximo do texto (markdown)")
    ap.add_argument("--baixar-fotos", metavar="PASTA", help="baixa as fotos da galeria nesta pasta (foto-1, foto-2…)")
    ap.add_argument("--max-fotos", type=int, default=8)
    ap.add_argument("--cdp", help="endereço de um Chrome já aberto com --remote-debugging-port (ex.: http://localhost:9222)")
    args = ap.parse_args()

    out = asyncio.run(read(args.url, args.max_chars, args.cdp))
    if args.baixar_fotos and out["images"]:
        out["downloaded"] = download(out["images"], args.baixar_fotos, args.max_fotos)
    text = json.dumps(out, ensure_ascii=False, indent=2)
    if args.saida:
        with open(args.saida, "w", encoding="utf-8") as fh:
            fh.write(text)
        print(f"ok={out['ok']} · {len(out['images'])} fotos · texto com {len(out['markdown'])} caracteres → {args.saida}")
    else:
        sys.stdout.reconfigure(encoding="utf-8")
        print(text)
    sys.exit(0 if out["ok"] else 2)


if __name__ == "__main__":
    main()
