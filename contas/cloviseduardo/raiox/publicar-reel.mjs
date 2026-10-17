// Agenda um Reel na conta indicada para daqui a poucos minutos (o cron publica a cada 5 min).
// Uso: node contas/cloviseduardo/raiox/publicar-reel.mjs <@conta> <video.mp4> <capa.jpg> <legenda.txt> "<rótulo>"
import { readFileSync } from "node:fs"
import path from "node:path"
import { agentApi } from "../../../conteudo/kit/common.mjs"

const [conta, video, capa, legendaFile, label] = process.argv.slice(2)
if (!conta || !video || !capa || !legendaFile) throw new Error("Uso: node contas/cloviseduardo/raiox/publicar-reel.mjs <@conta> <video.mp4> <capa.jpg> <legenda.txt> [rotulo]")
const api0 = agentApi(conta)
const api = (route, init = {}) => api0(route, { ...init, headers: { "X-Account": conta, ...(init.headers || {}) } })

async function enviar(file, type) {
  const name = path.basename(file)
  const { path: dest, signedUrl } = await api("upload-url", { method: "POST", body: JSON.stringify({ name }) })
  const res = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": type }, body: readFileSync(file) })
  if (!res.ok) throw new Error(`upload de ${name} falhou: HTTP ${res.status}`)
  return dest
}

const caption = readFileSync(legendaFile, "utf8").trim()
const videoPath = await enviar(video, "video/mp4")
const coverPath = await enviar(capa, "image/jpeg")
const when = new Date(Date.now() + 2 * 60_000)
const { item } = await api("schedule", {
  method: "POST",
  body: JSON.stringify({ kind: "reel", scheduledAt: when.toISOString(), paths: [videoPath], coverPath, caption, label: label || "Reel" }),
})
console.log(JSON.stringify(item))
