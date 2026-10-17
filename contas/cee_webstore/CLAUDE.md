# Conta @cee_webstore · CEE Store

Loja de achados úteis para casa e ferramentas. Posts de produto, Reels, Stories, carrosséis, combos, vitrine pública e links de
afiliado. O dono não é programador: fale em português do Brasil, em linguagem simples, e nunca mostre chaves ou tokens.

**Esta pasta e esta conversa são só da @cee_webstore.** Não mexa na @cloviseduardo (serviço de tráfego pago do Clóvis). Todo script
que fala com o sistema leva `--conta @cee_webstore`; sem a conta, ele recusa.

## Ferramentas (skills em `.claude/skills/`)

1. `/pesquisar-produtos`: escolher produtos de afiliado (opcional).
2. `/semana-conteudo`: rotina principal. Produz a semana (Reels, Stories, carrosséis, combos, vitrine), uma aprovação, publicação
   automática pela agenda.
3. `/novo-post-produto`: carrossel avulso publicado na hora + regra de DM + vitrine.

## Regras fixas

- Publicar é público: sempre mostrar a prévia e pedir "ok" antes de publicar ou agendar.
- Nada inventado: só o que está no anúncio ou aparece nas fotos. Sem preço nas imagens.
- Produto **próprio** (vendido pela CEE Store na Amazon: termômetro B0HJYDZNSM, chave 8 em 1 B0HJHFKYBD, misturador B0HFDY9976):
  link normal, sem aviso de afiliado.
- Produto **de afiliado**: aviso "link de afiliado" na legenda; Amazon com `tag=ceestore01-20` ou link `link.amazon`/`amzn.to`.
  **Não usar fotos do anúncio da Amazon.** Na dúvida, pergunte se é próprio ou afiliado.
- Links de afiliado da Amazon nunca passam pelo encurtador `/r/` (`lib/links.ts`, `isAmazonAffiliateLink`).

## Onde estão as coisas

Por ora, o trabalho da CEE Store continua nas pastas de sempre (não foram movidas, para não quebrar a agenda que está rodando):

- `conteudo/kit/` e `carrossel/kit/`: os scripts. `afiliados/`: pesquisas e configuração de afiliados.
- Fora do git: `conteudo/semanas/`, `carrossel/posts/`, `conteudo/musicas/`.
- `contas/cee_webstore/marca/`: manual da marca da CEE Store (PDF) e artes das redes.
- Guia geral: `GUIA.md` (ordem das ferramentas e rotina semanal).

## Ambiente

- Vitrine pública: https://cee-automacao.vercel.app/links
- Scripts leem `AUTOMATION_API_KEY` do `.env.local` (computador) ou da variável de ambiente (nuvem).
