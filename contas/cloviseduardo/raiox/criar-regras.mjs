// Cria (ou atualiza) as regras RAIOX da conta @cloviseduardo: comentário e Direct com a palavra RAIOX.
// Rode DEPOIS da migração 010 (tabela lead_flows):
//   node contas/cloviseduardo/raiox/criar-regras.mjs <@conta> <id_do_post>   → regra só nos comentários desse post (uso normal)
//   node contas/cloviseduardo/raiox/criar-regras.mjs <@conta> --dm           → regra de Direct (RAIOX enviado por mensagem, vale para a conta toda)
// Sem id de post e sem --dm, não cria nada: a regra nunca vira global sem o dono pedir.
import { createRequire } from "node:module"
import { readEnv } from "../../../conteudo/kit/common.mjs"

const require = createRequire(import.meta.url)
const { createClient } = require("@supabase/supabase-js")
const env = readEnv()
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const USERNAME = (process.argv[2] || "cloviseduardo").replace(/^@/, "")
const ARG = process.argv[3] || ""
const DM = ARG === "--dm"
const MEDIA_ID = DM ? "" : ARG.replace(/\D/g, "")
if (!DM && !MEDIA_ID) throw new Error("Informe o id do post (ex.: node contas/cloviseduardo/raiox/criar-regras.mjs @cloviseduardo 1789...) ou --dm")
const { data: user } = await db.from("users").select("id, username").eq("username", USERNAME).maybeSingle()
if (!user) throw new Error(`Conta @${USERNAME} não está conectada`)

const { error: probe } = await db.from("lead_flows").select("id").limit(1)
if (probe) throw new Error(`A tabela lead_flows não existe: rode a migração 010 no Supabase antes. (${probe.message})`)

const content = {
  // Comentário: a pessoa recebe um cartão com o botão e só depois de tocar a conversa começa (abre a janela de resposta).
  // Direct (--dm): a pessoa já escreveu, então a primeira pergunta sai direto.
  direct_send: false,
  check_follow: false,
  reply_mode: "both",
  optin_title: "Quer receber o seu Raio-X gratuito?",
  optin_subtitle: "Eu analiso o Instagram e o site do seu negócio e te mando o resultado aqui.",
  optin_button: "Sim, quero o Raio-X",
  message: "Perfeito. Qual é o @ do Instagram do seu negócio?",
  public_replies: ["Te mandei no direct.", "Já te chamei no direct.", "Olha o direct, te mandei uma mensagem."],
  add_tags: ["raiox"],
  flow: {
    id: "raiox",
    followups: [
      "Obrigado. E qual é o site do seu negócio? Se não tiver, responda: não tenho.",
      "Você já anuncia hoje? Se sim, quanto investe por mês, mais ou menos?",
      "Por último: qual é o seu maior objetivo agora? Mais clientes, mais pedidos de orçamento ou vender um produto específico?",
    ],
    validate_first: "contact",
    retry_message: "Não consegui identificar o @. Me manda o @ do Instagram do seu negócio, por exemplo @minhaloja.",
    done_message:
      "Recebi tudo. Vou analisar o perfil e o site e te mando o seu Raio-X por aqui. Se algum ponto eu não conseguir ler, eu te aviso qual foi.",
    done_tag: "raiox-pedido",
    notify: true,
    notify_title: "Novo pedido de Raio-X",
    labels: ["@ do Instagram", "Site", "Anuncia e investimento", "Objetivo"],
  },
}

const rules = DM
  ? [{ name: "RAIOX: Direct", trigger_source: "dm", trigger_type: "keyword", media: null }]
  : [{ name: `RAIOX: post ${MEDIA_ID}`, trigger_source: "comment", trigger_type: "keyword", media: MEDIA_ID }]
for (const { media, ...r } of rules) {
  const row = { user_id: user.id, ...r, trigger_value: "raiox, raio-x, raio x", response_type: "pro", response_content: content, is_active: true, specific_media_id: media }
  const { data: existing } = await db.from("automations").select("id").eq("user_id", user.id).eq("name", r.name).maybeSingle()
  const { error } = existing
    ? await db.from("automations").update({ ...row, updated_at: new Date().toISOString() }).eq("id", existing.id)
    : await db.from("automations").insert(row)
  if (error) throw new Error(`${r.name}: ${error.message}`)
  console.log(`${existing ? "atualizada" : "criada"}: ${r.name}`)
}
