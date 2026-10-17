# Conta @cloviseduardo · Clóvis Eduardo, estratégia de marketing

Conta pessoal do Clóvis Eduardo Escarabelin, gestor de tráfego e estrategista de marketing em Jundiaí (SP). Vende serviço de
gestão de tráfego pago para negócios locais, imobiliárias e profissionais liberais (Jundiaí, Campinas, região e online).
O dono não é programador: fale em português do Brasil, em linguagem simples, e nunca mostre chaves ou tokens.

**Esta pasta e esta conversa são só da @cloviseduardo.** Não mexa na @cee_webstore (loja de produtos). Todo script que fala com
o sistema leva `--conta @cloviseduardo`; sem a conta, ele recusa.

## Leia antes de qualquer tarefa

1. `estrategia/ESTRATEGIA.md`: as decisões atuais. Vale mais que qualquer outro arquivo.
2. `marca/README.md` e `marca/tokens.json`: identidade visual (verde, creme, terracota · Fraunces + Manrope). Toda peça nova segue.
3. Conteúdo: `estrategia/ROTEIROS-REELS.md` e `estrategia/CALENDARIO.md`.
4. Direct automático e Raio-X: `estrategia/AUTOMACAO-RAIOX.md` e `raiox/`.
5. Pendências: `estrategia/PENDENCIAS.md`.

## Onde estão as coisas

```
contas/cloviseduardo/
  CLAUDE.md          este arquivo
  marca/             CÓPIA do manual da marca do Drive (tokens, logos, fontes). Fonte oficial: Drive, MARCA 2026
  estrategia/        CÓPIA dos documentos do Drive (FUNIL 2026 - CLAUDE CODE/docs). Fonte oficial: o Drive
  raiox/             o motor do Raio-X: coletar.py, gerar.mjs, fila.mjs, criar-regras.mjs, publicar-reel.mjs, hotmart-arte.mjs
    pedidos/         (fora do git) cada pedido: coleta, dados, PDF e imagens
```

O **site** continua no Drive (`...\FUNIL 2026 - CLAUDE CODE\site`) e é publicado na Hostinger (`public_html`, pelo Gerenciador de
Arquivos). O backup anterior fica em `site-anterior`. Edite lá e mostre a prévia antes de subir.

As cópias em `marca/` e `estrategia/` servem para trabalhar sem depender do Drive. Se mudar a estratégia ou a marca, mude no
Drive e copie de novo (ou avise para sincronizar), para não existirem duas versões diferentes.

## Regras que não mudam

- Voz: primeira pessoa e "você". Frases curtas, com número, prazo ou entrega concreta. A língua do cliente, não a do gestor de tráfego.
- Nunca prometer vendas. A frase da marca: "Não prometo vendas. Garanto o que depende de mim."
- Não prometer prazo de entrega do Raio-X. Não falar em "vagas limitadas" sem o Clóvis confirmar que é verdade.
- Números e casos só reais e autorizados: +R$1 mi em verba gerenciada, 30+ clientes, 200+ leads por mês no pico de um cliente,
  depoimentos da Fabiana (Camargo & Marangon) e do Marcio (Hadja Imóveis).
- Sem emoji nas peças da marca. Sem hashtags nos posts.
- Nada pago sem o OK do Clóvis (ex.: Apify). A leitura de perfis do Raio-X é gratuita (Scrapling).
- Publicar é público: mostrar a prévia e pedir "ok" antes de publicar ou subir algo. Exceção: quando o Clóvis disser, no pedido
  atual, para publicar direto.
- **Entrega do Raio-X sem revisão humana** (decisão de 15/10/2026): vale só para esse fluxo, com as travas da skill
  `/raiox-automatico` (só fatos, "Não verificado" explicado ao lead, nada de promessa).

## Funil, em uma linha

Conteúdo no Instagram → comentar **RAIOX** → botão "Sim, quero o Raio-X" no Direct → 4 perguntas (@, site, anuncia, objetivo) →
análise automática a cada 15 min → 5 imagens e o PDF no Direct, com o convite do 1º mês por R$97. O site é para quem já quer
contratar (R$97 + WhatsApp); o Raio-X fica centralizado no Instagram.

## Ferramentas

- Skills: `/raiox-automatico` (fila de pedidos), `/carrossel` e `/edicao-motion` (do Clóvis, globais).
- Lançar um post com RAIOX: `node contas/cloviseduardo/raiox/publicar-reel.mjs @cloviseduardo <video> <capa> <legenda.txt> "<rótulo>"`;
  depois de publicado, pegue o `media_id` na agenda e rode
  `node contas/cloviseduardo/raiox/criar-regras.mjs @cloviseduardo <media_id>` (a regra vale só nesse post).
- Fila: `node contas/cloviseduardo/raiox/fila.mjs proximo --conta @cloviseduardo`.
- Tarefa agendada `raiox-automatico` (a cada 15 min, com o app do Claude aberto): processa a fila sozinha.
- Painel: https://cee-automacao.vercel.app/dashboard (seletor de conta no menu lateral).

## Contatos e links

- WhatsApp: (11) 99278-0521 · https://wa.me/5511992780521
- Instagram: https://www.instagram.com/cloviseduardo/ · YouTube: https://www.youtube.com/@clovisescarabelin
- Hotmart, produto 8057756 (1º mês R$97): venda `https://go.hotmart.com/W106592197V`, checkout
  `https://pay.hotmart.com/W106592197V?checkoutMode=10`. O checkout mostra "Studio Wellness LTDA ME" (nome completo da conta).
- Domínio: cloviseduardo.com (Hostinger).
