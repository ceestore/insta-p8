// Artes do produto na Hotmart, na marca do Clóvis Eduardo (verde, creme, terracota · Fraunces + Manrope).
// Uso: node contas/cloviseduardo/raiox/hotmart-arte.mjs [pasta_de_saida]
import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const puppeteer = require("puppeteer-core")
const AQUI = path.dirname(fileURLToPath(import.meta.url))
const A = (f) => path.join(AQUI, "assets", f)
const b64 = (f) => readFileSync(A(f)).toString("base64")
const svg = (f) => readFileSync(A(f), "utf8").replace(/<metadata>[\s\S]*?<\/metadata>/g, "")
const saida = path.resolve(process.argv[2] || path.join(AQUI, "saida-hotmart"))
mkdirSync(saida, { recursive: true })

const CSS = `
@font-face{font-family:'Fraunces';src:url(data:font/ttf;base64,${b64("Fraunces.ttf")});font-weight:100 900;font-style:normal}
@font-face{font-family:'Fraunces';src:url(data:font/ttf;base64,${b64("Fraunces-Italic.ttf")});font-weight:100 900;font-style:italic}
@font-face{font-family:'Manrope';src:url(data:font/ttf;base64,${b64("Manrope.ttf")});font-weight:200 800}
*{box-sizing:border-box;margin:0;padding:0}
:root{--verde:#12352B;--escuro:#0E2A22;--creme:#F5EFE4;--terra:#B9472F;--ouro:#C9A45C;--claro:#E3876A}
body{font-family:'Manrope',sans-serif;-webkit-font-smoothing:antialiased}
h1,.preco{font-family:'Fraunces',serif;font-weight:500}
em{font-style:italic;color:var(--claro)}
.logo svg{display:block;height:100%;width:auto}
`

// 1) Imagem do produto (quadrada, JPG/PNG até 5 MB; ideal 600x600, aqui em 1200x1200 para ficar nítida)
const produto = `<!doctype html><meta charset=utf-8><style>${CSS}
body{width:1200px;height:1200px;background:var(--escuro);color:var(--creme);position:relative;overflow:hidden}
.logo{position:absolute;left:84px;top:80px;height:92px}
.rotulo{position:absolute;left:84px;top:300px;font-weight:700;font-size:26px;letter-spacing:.22em;text-transform:uppercase;color:var(--ouro)}
h1{position:absolute;left:84px;top:350px;width:1020px;font-size:128px;line-height:1.02;letter-spacing:-.01em}
.preco{position:absolute;left:84px;top:760px;font-size:210px;line-height:1;color:var(--creme)}
.preco small{font-family:'Manrope';font-size:34px;font-weight:600;color:#C9C1B2;margin-left:22px;letter-spacing:0}
.lista{position:absolute;left:84px;top:1010px;font-size:32px;line-height:1.5;color:#E4DCCB}
.lista span{color:var(--ouro);margin-right:14px}
.faixa{position:absolute;right:0;top:0;width:34px;height:100%;background:var(--terra)}
</style><body><div class=faixa></div>
<div class=logo>${svg("logo-horizontal-negativo.svg")}</div>
<div class=rotulo>Gestão de tráfego pago</div>
<h1>Campanhas no ar em <em>7 dias</em></h1>
<div class=preco>R$97<small>no 1º mês</small></div>
<div class=lista><span>—</span>Estrutura completa e até 2 campanhas, direto comigo</div>
</body>`

async function render(html, file, w, h) {
  const browser = await puppeteer.launch({
    executablePath: ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync),
    headless: true,
    args: ["--no-sandbox"],
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: "load" })
    await page.evaluate("document.fonts.ready")
    await page.screenshot({ path: path.join(saida, file), type: file.endsWith(".jpg") ? "jpeg" : "png", ...(file.endsWith(".jpg") ? { quality: 92 } : {}) })
  } finally {
    await browser.close()
  }
  console.log(path.join(saida, file))
}

await render(produto, "produto-1200.jpg", 1200, 1200)
