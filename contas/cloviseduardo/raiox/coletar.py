#!/usr/bin/env python3
"""Coleta, só de páginas públicas, o que o Raio-X precisa de um perfil do Instagram e/ou de um site.

Uso:  python contas/cloviseduardo/raiox/coletar.py --handle cloviseduardo --site https://exemplo.com.br [--posts 8]
Saída: um JSON no stdout. Campo `erros` lista o que NÃO foi possível ler (vira "Não verificado" no Raio-X).

Usa Scrapling (pip install scrapling). Sem login, sem contornar bloqueio: se o Instagram pedir login ou bloquear,
o campo fica vazio e o motivo vai em `erros`. Poucas páginas por pedido, com pausa entre elas.
"""
import argparse
import datetime
import json
import re
import sys
import time

sys.stdout.reconfigure(encoding="utf-8")
import logging

logging.disable(logging.INFO)

from scrapling.fetchers import DynamicFetcher, Fetcher  # noqa: E402

ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"


def data_do_codigo(codigo: str) -> str:
    """O código do post (/p/XXXX) carrega a hora da publicação (id de mídia do Instagram)."""
    n = 0
    for c in codigo[:11]:
        n = n * 64 + ALFABETO.index(c)
    ms = (n >> 23) + 1314220021721
    return datetime.datetime.fromtimestamp(ms / 1000, datetime.timezone.utc).strftime("%Y-%m-%d")


def numero(txt: str) -> int | None:
    m = re.search(r"(\d[\d.,]*)\s*([kKmM]?)", txt or "")
    if not m:
        return None
    try:
        if m.group(2) == "":
            return int(re.sub(r"[.,]", "", m.group(1)))
        return int(float(m.group(1).replace(",", ".")) * {"k": 1_000, "m": 1_000_000}[m.group(2).lower()])
    except ValueError:
        return None


def instagram(handle: str, n_posts: int, erros: list) -> dict | None:
    handle = handle.strip().lstrip("@").lower()
    url = f"https://www.instagram.com/{handle}/"
    out = {"handle": handle, "url": url}
    try:
        p = DynamicFetcher.fetch(url, headless=True, network_idle=True, timeout=45000)
    except Exception as e:
        erros.append(f"Instagram @{handle}: não consegui abrir a página ({type(e).__name__})")
        return None
    texto = p.get_all_text()
    html = p.html_content
    if p.status == 404 or re.search(r"(página não está disponível|page isn.t available|Sorry, this page)", texto, re.I):
        erros.append(f"Instagram @{handle}: o perfil não existe ou o @ está errado")
        return None
    if re.search(r"(conta é privada|account is private)", texto, re.I):
        erros.append(f"Instagram @{handle}: o perfil é privado, não consegui ler as publicações")
        out["privado"] = True
        return out
    if re.search(r"(Entrar no Instagram|Log in to Instagram)", texto[:300], re.I) and "seguidores" not in texto and "followers" not in texto:
        erros.append(f"Instagram @{handle}: o Instagram pediu login e não mostrou o perfil")
        return None

    og = p.css('meta[property="og:description"]::attr(content)').get() or ""
    m = re.search(r"(\d[\d.,]*[KkMm]?)\s*(?:Followers|seguidores)", og + " " + texto)
    out["seguidores"] = numero(m.group(1)) if m else None
    m = re.search(r"(\d[\d.,]*[KkMm]?)\s*(?:Following|seguindo)", og + " " + texto)
    out["seguindo"] = numero(m.group(1)) if m else None
    m = re.search(r"(\d[\d.,]*[KkMm]?)\s*(?:Posts|publicações)", og)
    out["total_posts"] = numero(m.group(1)) if m else None

    # Bio: o texto entre "seguindo" e a barra de abas (Posts / Reels / Marcados).
    m = re.search(r"(?:seguindo|following)\s+(.*?)\s+(?:Posts|Publicações)\s+(?:Reels)", texto, re.I | re.S)
    corpo = (m.group(1) if m else "").strip()
    out["nome_e_bio"] = re.sub(r"\s+", " ", corpo)[:600]
    out["links_da_bio"] = sorted(set(re.findall(r"(?:https?://|www\.)[\w./?=&%#-]+", corpo)))[:5]
    out["categoria_ou_texto_de_perfil"] = out["nome_e_bio"][:200]
    if not out["nome_e_bio"]:
        erros.append(f"Instagram @{handle}: não consegui ler a bio")

    codigos = []
    for c in re.findall(r"/(?:p|reel)/([\w-]{6,})", html):
        if c not in codigos:
            codigos.append(c)
    posts = []
    for c in codigos[: n_posts + 4]:
        if len(posts) >= n_posts:
            break
        time.sleep(1.5)
        item = {"codigo": c[:11], "data": data_do_codigo(c), "tipo": "reel" if re.search(rf"/reel/{re.escape(c)}", html) else "post"}
        try:
            pg = Fetcher.get(f"https://www.instagram.com/{'reel' if item['tipo'] == 'reel' else 'p'}/{c}/", timeout=20)
            desc = pg.css('meta[property="og:description"]::attr(content)').get() or ""
            dono = re.search(r"comments? - (\S+) (?:on|no|em)\b", desc)
            if dono and dono.group(1).lower() != handle:
                continue  # post de outra conta (marcação/colaboração)
            lk = re.search(r"(\d[\d.,]*[KkMm]?) likes?", desc)
            cm = re.search(r"(\d[\d.,]*[KkMm]?) comments?", desc)
            item["curtidas"] = numero(lk.group(1)) if lk else None
            item["comentarios"] = numero(cm.group(1)) if cm else None
            leg = re.search(r':\s*"(.*)"\.?\s*$', desc, re.S)
            item["legenda"] = re.sub(r"\s+", " ", leg.group(1))[:300] if leg else ""
        except Exception:
            item["curtidas"] = item["comentarios"] = None
        posts.append(item)
    out["posts_recentes"] = posts
    if not posts:
        erros.append(f"Instagram @{handle}: não consegui listar as publicações recentes")
    else:
        recentes = [x for x in posts if x["data"] >= (datetime.date.today() - datetime.timedelta(days=30)).isoformat()]
        out["posts_ultimos_30_dias_na_amostra"] = len(recentes)
        out["data_do_ultimo_post"] = max(x["data"] for x in posts)
    return out


def site(url: str, erros: list) -> dict | None:
    if not re.match(r"https?://", url):
        url = "https://" + url
    try:
        p = Fetcher.get(url, timeout=25)
        if p.status >= 400 or len(p.get_all_text()) < 200:
            p = DynamicFetcher.fetch(url, headless=True, network_idle=True, timeout=45000)
    except Exception as e:
        erros.append(f"Site {url}: não consegui abrir ({type(e).__name__})")
        return None
    if p.status >= 400:
        erros.append(f"Site {url}: respondeu erro {p.status}")
        return None
    texto = re.sub(r"\s+", " ", p.get_all_text())
    links = []
    for a in p.css("a"):
        href = (a.attrib.get("href") or "").strip()
        if href and not href.startswith(("#", "javascript:")):
            links.append({"texto": re.sub(r"\s+", " ", a.get_all_text())[:60], "href": href[:200]})
    zap = [l for l in links if re.search(r"(wa\.me|whatsapp|api\.whatsapp)", l["href"], re.I)]
    return {
        "url": url,
        "titulo": (p.css("title::text").get() or "").strip(),
        "descricao": (p.css('meta[name="description"]::attr(content)').get() or "").strip(),
        "texto_inicial": texto[:2500],
        "tem_whatsapp": bool(zap),
        "links_whatsapp": zap[:3],
        "primeiros_botoes_e_links": links[:15],
        "menciona_depoimentos": bool(re.search(r"(depoimento|avaliaç|clientes? (diz|falam)|testimonial)", texto, re.I)),
        "menciona_preco": bool(re.search(r"R\$\s?\d", texto)),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--handle", default="")
    ap.add_argument("--site", default="")
    ap.add_argument("--posts", type=int, default=8)
    a = ap.parse_args()
    erros: list[str] = []
    res = {"coletado_em": datetime.date.today().isoformat(), "instagram": None, "site": None, "erros": erros}
    if a.handle:
        res["instagram"] = instagram(a.handle, min(a.posts, 12), erros)
    if a.site:
        res["site"] = site(a.site, erros)
    if not a.handle and not a.site:
        erros.append("Nenhum @ nem site informado")
    print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
