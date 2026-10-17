# Insta Auto (CEE Automação) — um sistema, duas contas

Sistema de automação do Instagram (comentário → DM, agenda de posts, vitrine, Raio-X) usado em **duas contas separadas**. O dono
não é programador: fale em português do Brasil, em linguagem simples, e nunca mostre chaves ou tokens.

## Regra número 1: qual conta?

| Conta | Para quê | Instruções e pastas |
|---|---|---|
| **@cee_webstore** | Loja: produtos, afiliados, Reels, Stories, carrosséis, vitrine | `contas/cee_webstore/CLAUDE.md` |
| **@cloviseduardo** | Serviço de tráfego pago do Clóvis: funil do Raio-X, conteúdo de autoridade, site | `contas/cloviseduardo/CLAUDE.md` |

- **Antes de qualquer tarefa, descubra de qual conta ela é.** Se não estiver claro, pergunte. Leia o `CLAUDE.md` da conta.
- **Uma conversa por conta.** Se o pedido for da outra conta, avise o dono em vez de misturar.
- **Todo script que fala com o sistema exige `--conta @nome`** (ou a variável `AGENT_ACCOUNT` da sessão). Sem a conta, ele recusa,
  para não publicar na conta errada. Nunca confie na conta padrão.
- O painel (https://cee-automacao.vercel.app/dashboard) tem o seletor de conta no menu lateral.

## O sistema (comum às duas contas)

- **Comece pelo `GUIA.md`**: o que existe, ordem das ferramentas e rotina. Mantenha-o atualizado quando criar ou mudar uma ferramenta.
- Detalhes técnicos (infraestrutura, variáveis, migrações, testes): `README.md`.
- Código: `app/`, `lib/` (Next.js + Supabase + Vercel). Cada conta é uma linha de `users`; o webhook, as rotinas e a API do
  agente escolhem a conta pelo id/`X-Account`, nunca por "a primeira".
- Skills (em `.claude/skills/`): da CEE Store `/pesquisar-produtos`, `/semana-conteudo`, `/novo-post-produto`; do Clóvis `/raiox-automatico`.

## Ambiente

- Produção: https://cee-automacao.vercel.app (Vercel publica o branch `main`). Vitrine pública da CEE Store: `/links`.
- Scripts leem `AUTOMATION_API_KEY` do `.env.local` (computador) ou da variável de ambiente (nuvem).
- Pastas de trabalho fora do git: `carrossel/posts/`, `conteudo/semanas/`, `conteudo/musicas/`, `contas/cloviseduardo/raiox/pedidos/`.
- Mudança de código: branch próprio → pull request → o dono aprova o merge no GitHub. Rode `npx tsc --noEmit` antes.
  Migrações SQL (`migrations/`) são rodadas pelo dono no SQL Editor do Supabase: evite quando der.
- Git: o login do GitHub só funciona no PowerShell do dono. Depois do commit, peça para ele rodar
  `git push -u origin <branch>` na pasta do projeto; eu abro o pull request e ele faz o merge.
