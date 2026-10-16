import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// GET /api/accounts — the Instagram accounts connected to this system (id + @ only, never tokens),
// for the account switcher in the dashboard. Only accounts in ALLOWED_INSTAGRAM_USERNAMES are listed,
// in the order of that list.
export async function GET() {
  const clean = (u: string) => u.trim().replace(/^@/, "").toLowerCase()
  const allowed = (process.env.ALLOWED_INSTAGRAM_USERNAMES || "").split(",").map(clean).filter(Boolean)
  const db = await getSupabaseServerClient()
  const { data, error } = await db.from("users").select("id, username")
  if (error) return NextResponse.json({ error: "Não foi possível carregar as contas" }, { status: 500 })
  const rows = (data || []).filter((u: any) => !allowed.length || allowed.includes(clean(String(u.username))))
  const rank = (name: string) => {
    const i = allowed.indexOf(clean(name))
    return i < 0 ? 999 : i
  }
  rows.sort((a: any, b: any) => rank(a.username) - rank(b.username))
  return NextResponse.json({ accounts: rows.map((u: any) => ({ id: String(u.id), username: String(u.username) })) })
}
