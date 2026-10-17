# Automação RAIOX no app próprio

O app é a ferramenta estilo ManyChat que o Clóvis está construindo no Claude Code (base open source InstaAuto/insta-p8). Hoje ele atende uma conta só, a @cee_webstore. O objetivo agora é adicionar a @cloviseduardo e deixar o app pronto para várias contas do próprio Clóvis (sem multi-cliente). Tudo precisa continuar 100% gratuito.

## Parte 1: o que o Clóvis faz antes (fora do código)

1. Conferir que a @cloviseduardo é conta Comercial ou de Criador de Conteúdo.
2. No Instagram da @cloviseduardo: Configurações > Mensagens e respostas ao story > Controles de mensagens > Ferramentas conectadas > ativar "Permitir acesso às mensagens".
3. No painel do app da Meta (developers.facebook.com) usado para a Cee Store: Funções do app > Funções > Testadores do Instagram > adicionar @cloviseduardo.
4. No Instagram da @cloviseduardo: Configurações > Apps e sites > Convites de testador > aceitar.

Com o app em modo de desenvolvimento e as duas contas como testadoras, não precisa de revisão da Meta.

## Parte 2: o que implementar no código

Antes de mudar qualquer coisa:
1. Ler o projeto e explicar em poucas linhas onde estão hoje o token de acesso, o ID da conta, o webhook e as automações.
2. Conferir na documentação atual da Meta (Instagram API com login do Instagram) os nomes de permissões, campos de webhook e endpoints abaixo, e avisar se algo mudou.

Implementar:

1. **Cadastro de contas:** tabela "contas" com id interno, ig_user_id, username, access_token (criptografado ou fora do repositório), data de expiração do token, ativa, criada_em. Migrar a Cee Store para essa tabela sem perder nada.
2. **Tudo pertence a uma conta:** automações, gatilhos, contatos, conversas, mensagens e logs ganham conta_id. A migração preenche conta_id = Cee Store no que já existe. Nenhum token ou ID fixo no código.
3. **Conectar conta nova:** botão "Conectar conta do Instagram" via OAuth do Instagram com instagram_business_basic, instagram_business_manage_messages e instagram_business_manage_comments. Trocar o token curto pelo de longa duração (60 dias). Inscrever a conta no webhook: `POST /{ig_user_id}/subscribed_apps` com `subscribed_fields=comments,messages`. Alternativa simples: colar o token numa tela de configurações, validando com `GET /me`.
4. **Webhook com várias contas:** um endpoint só. Usar `entry[].id` para achar a conta e rodar só as automações dela. Ignorar com log eventos de conta desconhecida ou inativa e eventos gerados pela própria conta (evitar loop).
5. **Renovação de token:** rotina diária que renova tokens que vencem em menos de 15 dias (`GET graph.instagram.com/refresh_access_token`) e avisa se falhar.
6. **Painel:** seletor de conta no topo; listas filtradas pela conta; tela "Contas" com username, status e vencimento do token.
7. **Testes:** roteamento do webhook com payload falso de cada conta; a automação da Cee Store tem de continuar igual.

Ao terminar: passo a passo para conectar a @cloviseduardo e como testar (comentar a palavra-chave com outra conta e ver o Direct chegar).

## Limite da Meta que o fluxo precisa respeitar

A resposta privada a um comentário é **uma única mensagem**, enviada em até 7 dias após o comentário. A conversa só continua depois que a pessoa responde, e a partir daí há uma janela de 24 horas para as próximas mensagens. Por isso a primeira mensagem precisa pedir uma resposta.

## Fluxo RAIOX (rascunho, ajustar ao formato do app)

**Gatilho:** comentário contendo "raiox" (sem diferenciar maiúsculas, com ou sem hífen) em qualquer post da @cloviseduardo, ou mensagem no Direct com "raiox".

**Resposta pública ao comentário (opcional):** "Te mandei no direct."

**Mensagem 1 (resposta privada ao comentário):**
> Oi! Aqui é o Clóvis. Vou fazer o Raio-X gratuito do seu negócio. Para começar, me responde aqui com o @ do Instagram ou o site do seu negócio.

**Depois da resposta (janela de 24h aberta):**
> Ótimo, anotado. Mais duas perguntas rápidas:
> 1. Você já anuncia hoje? Se sim, quanto investe por mês, mais ou menos?
> 2. Qual é o seu maior objetivo agora: mais clientes, mais pedidos de orçamento ou vender um produto específico?

**Depois das respostas:**
> Perfeito. Vou analisar o seu perfil, o seu site e os seus anúncios e te mando o Raio-X por aqui. Se preferir receber no WhatsApp, me passa o seu número.

**Salvar no contato:** @ ou site, se anuncia e quanto, objetivo, data do pedido, origem (comentário, Direct ou anúncio). Marcar como "Raio-X pedido" e avisar o Clóvis.
