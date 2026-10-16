import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { recordEvent } from "@/lib/contacts"

// Link-preview crawlers (Instagram/Facebook fetch every URL sent in a DM) must not count as clicks.
const BOT_UA = /facebookexternalhit|facebot|meta-externalagent|bot|crawler|spider|preview|slurp/i
const FILE_URL_TTL_SECONDS = 600

function notFound() {
  return new NextResponse(
    "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Link indisponível</title>" +
      "<body style='font-family:system-ui;padding:40px;text-align:center'><h1 style='font-size:20px'>Link indisponível</h1>" +
      "<p>Este link expirou ou não existe mais. Peça um novo pelo direct da @cee_webstore.</p></body>",
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
  )
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/**
 * A Raio-X PDF link opens a web page (page images + PDF button) instead of redirecting to the file: PDFs behind a
 * redirect often fail inside Instagram's in-app browser, while a normal HTML page always opens.
 */
async function raioxPage(db: any, file: { storage_path: string; name: string }, pdfUrl: string): Promise<NextResponse | null> {
  const m = file.storage_path.match(/^(\d+)\/raiox\/([0-9a-f-]{36})-[A-Za-z0-9]+\.pdf$/)
  if (!m) return null
  const [, userId, flowId] = m
  const { data: listed } = await db.storage.from("arquivos").list(`${userId}/raiox`, { search: flowId, sortBy: { column: "created_at", order: "asc" } })
  const names = (listed || []).map((i: any) => i.name).filter((n: string) => n.endsWith(".png"))
  const paths = names.map((n: string) => `${userId}/raiox/${n}`)
  const { data: signed } = paths.length ? await db.storage.from("arquivos").createSignedUrls(paths, 3600) : { data: [] }
  const images = (signed || []).map((x: any) => x.signedUrl).filter(Boolean)
  if (!images.length) return null
  const title = esc(file.name.replace(/\.pdf$/i, ""))
  const html =
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow"><title>${title}</title>` +
    `<style>body{margin:0;background:#F5EFE4;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1E1C19}` +
    `main{max-width:720px;margin:0 auto;padding:16px}img{display:block;width:100%;height:auto;border-radius:16px;margin:0 0 14px;border:1px solid #DCD2BF}` +
    `a.btn{display:block;text-align:center;background:#B9472F;color:#fff;text-decoration:none;font-weight:700;padding:16px;border-radius:999px;margin:8px 0 24px}` +
    `p{color:#5E584E;font-size:14px;text-align:center}</style></head><body><main>` +
    images.map((u: string, i: number) => `<img src="${esc(u)}" alt="${title}, página ${i + 1}">`).join("") +
    `<a class="btn" href="${esc(pdfUrl)}">Baixar o PDF</a><p>Clóvis Eduardo · Estratégia de marketing</p></main></body></html>`
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } })
}

// GET /r/<code> — counts the click and redirects to the URL or to a short-lived file URL.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  if (!/^[A-Za-z0-9]{6,16}$/.test(code)) return notFound()

  const db = await getSupabaseServerClient()
  const { data: link } = await db
    .from("tracked_links")
    .select("code, user_id, automation_id, ig_id, target_url, file_id, files(storage_path, name)")
    .eq("code", code)
    .maybeSingle()
  if (!link) return notFound()

  let destination: string | null = null
  let page: NextResponse | null = null
  if (link.file_id) {
    const file: any = Array.isArray(link.files) ? link.files[0] : link.files
    if (!file?.storage_path) return notFound()
    // Opened inline (PDFs and images display in Instagram's in-app browser; forced downloads often fail there).
    const { data } = await db.storage.from("arquivos").createSignedUrl(file.storage_path, FILE_URL_TTL_SECONDS)
    destination = data?.signedUrl || null
    if (destination) page = await raioxPage(db, file, destination)
  } else if (link.target_url && /^https?:\/\//i.test(link.target_url)) {
    destination = link.target_url
  }
  if (!destination) return notFound()

  const isBot = BOT_UA.test(request.headers.get("user-agent") || "")
  if (!isBot) {
    await db.rpc("register_link_click", { p_code: code })
    if (link.ig_id) {
      await recordEvent(db, link.user_id, link.ig_id, "link_click", { automationId: link.automation_id })
    }
  }

  if (page) return page
  return NextResponse.redirect(destination, { status: 302, headers: { "Cache-Control": "no-store" } })
}
