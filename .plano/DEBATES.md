# ForgeClaw — Debates entre Agentes

## Participantes

- **Maria** (34, dona de agência de marketing, não-técnica, usa ForgeClaw há 2 semanas)
- **Ricardo** (engenheiro sênior, 12 anos TypeScript/Node, consultor técnico)
- **Lucas** (28, solopreneur técnico, 3 negócios, power user há 1 mês)

---

# DEBATE 1: Maria vs Ricardo (10 rounds)
*Usuária final vs Engenheiro sênior*

---

## ROUND 1: Foto deletada antes do Claude ler

**Maria:** Mandei foto de proposta comercial pro bot TRÊS vezes achando que eu que estava fazendo errado. Perdi tempo, perdi paciência, e quase desisti do produto. "Fix trivial" só é trivial pra quem sabe programar — pra mim foi uma semana achando que o bot era burro com imagem.

**Ricardo:** Maria tem razão absoluta. Um fix de 2 linhas que previne o cenário exato que ela descreveu deveria ter sido pego em qualquer smoke test. O framing "debate arquitetural" era generoso demais — isso é negligência operacional, pura e simples. Ela quase desistiu do produto por uma linha de PRAGMA.

---

## ROUND 2: Crons só pelo dashboard

**Maria:** Não precisa criar o cron direto — o bot pode me MOSTRAR uma preview e pedir confirmação, tipo "Entendi: todo dia às 8h, resumo de tarefas. Confirma?" com botão Sim/Não. O Telegram já tem inline keyboards. Me obrigar a sair do Telegram pra abrir um dashboard web é como me obrigar a ir no site do banco pra fazer um Pix.

**Ricardo:** Cedo terreno aqui. Meu relatório focou no risco técnico, mas a Maria está apontando um problema de produto anterior: o fluxo de criação nem deveria exigir dashboard. Inline keyboards do Telegram suportam perfeitamente um wizard tipo "Nome? > Schedule? > Prompt? > Preview > Confirmar". O dashboard deveria ser o painel de gestão avançada, não o único ponto de entrada.

---

## ROUND 3: Compartilhar bot com equipe

**Maria:** "Cada pessoa ter sua instância" — Ricardo, você tem noção de quanto custa isso? Nem precisa ser multi-tenant sofisticado. Me dá ao menos um modo "somente leitura" por tópico. Nenhuma ferramenta de equipe em 2026 exige instância separada por pessoa.

**Ricardo:** Mantenho posição parcial. O problema de namespace collision é real e técnico. Mas a Maria está certa que "instância por pessoa" não é resposta viável. O schema já tem user_id e workspace_id — o esqueleto multi-tenant existe. O caminho pragmático é permissões por tópico. Ela tem razão no produto; eu tinha razão no bug.

---

## ROUND 4: Dashboard em inglês

**Maria:** Concordo que i18n feito direito é melhor. Mas enquanto a camada de tradução não existe, ao menos troca os 5 nomes de tab. São 30 strings, não 30% do código. Não precisa de framework de i18n pra trocar "Sessions" por "Conversas".

**Ricardo:** Maria tem razão completa. Trocar "Sessions" por "Sessões", "Memory" por "Memória" nos componentes React é um PR de 20 minutos. Não precisa de i18next pra isso. Faz o hardcode em português agora, extrai pra i18n quando tiver 2+ línguas. Perfeito é inimigo do bom.

---

## ROUND 5: Memória sem feedback

**Maria:** Tudo bem, faz sentido o anchor. Mas então o problema muda: me dá FEEDBACK. "Guardei na memória: João prefere comunicação formal" resolve 80% da minha frustração sem mudar nenhum regex.

**Ricardo:** Excelente ponto. O detectAndSaveImmediateMemory roda fire-and-forget e NUNCA notifica o usuário. A Maria quer só um `ctx.reply("Anotado na memória: ...")` condicional ao resultado. São 3 linhas de código, zero risco, e transforma uma feature invisível em algo que gera confiança.

---

## ROUND 6: Cron configurado pelo dashboard mas não funciona

**Maria:** Se EU configurei pelo dashboard selecionando o tópico no dropdown que o próprio dashboard me apresentou, e mesmo assim o topicId "não resolve" — isso NÃO é bug de configuração meu, é bug do produto. O dashboard está me deixando configurar algo quebrado sem avisar.

**Ricardo:** Concordo integralmente. A API valida se o topic existe no DB mas NÃO valida se o bot consegue ENVIAR mensagem naquele tópico. Um tópico pode existir no DB mas ter sido deletado no Telegram. O resultado é um cron "success" no log mas nada no tópico. Isso é exatamente o tipo de coisa que quebra a confiança do usuário.

---

## ROUND 7: Dashboard no celular

**Maria:** Aceito em parte. Mas gestão não é 9-18 no desktop. Se meu cron falhou às 8h e só vejo no desktop às 10h, perdi 2 horas. Pelo menos a tab de crons e a de sessões deveriam funcionar razoavelmente no celular.

**Ricardo:** Maria tem razão no caso de uso. Mas ofereço contra-proposta: o canal de notificação urgente JÁ EXISTE — é o Telegram. O que falta é tornar esse feedback mais acionável: incluir botão inline "Ver log" ou "Re-executar" direto no Telegram. O dashboard responsivo é desejável, mas o Telegram como surface móvel é mais barato e ela já está lá.

---

## ROUND 8: Run Now sem resultado no dashboard

**Maria:** Eu estou NO dashboard quando clico "Run Now". Ter que minimizar, abrir Telegram, achar tópico, scrollar — isso é tortura. "Duplicar canal" é argumento de engenheiro, não de usuário. Eu quero conveniência.

**Ricardo:** Maria está 100% certa e eu errei no framing. O ws-server emite cron:result via broadcast, mas o dashboard NÃO subscreve nesse canal após o Run Now. A infraestrutura de streaming está PRONTA — só falta o dashboard conectar. Isso não é duplicar canal, é completar uma feature entregue pela metade.

---

## ROUND 9: Harness/Personalidade

**Maria:** Me dá um wizard que pergunta "como seu assistente deve se chamar?" e monta o CLAUDE.md nos bastidores. Se um dia eu quiser editar o markdown cru, coloca um botão "modo avançado". O default tem que ser acessível. Hoje o default é o modo avançado — e isso exclui 90% dos usuários.

**Ricardo:** Sem nada a contestar. O install flow exige editar JSON, e o dashboard assume que você já sabe o que é cron expression e runtime. Um wizard interativo no primeiro acesso é investimento de produto, não de engenharia. Deveria ser prioridade P1.

---

## ROUND 10: Busca existe mas não está conectada

**Maria:** A funcionalidade EXISTE, o código está pronto, e ninguém conectou os fios? Isso é a diferença entre produto feito por devs pra devs e produto feito pra usuários. Se é "literalmente wiring", faz o wiring antes de lançar.

**Ricardo:** Esse é o ponto onde minha auditoria mais falhou em comunicar a gravidade. searchMessages() e searchMemoryEntries() existem no state-store, funcionam, estão indexados — e NÃO TEM NENHUM endpoint de API nem comando no bot. Falta literalmente um input field, uma rota GET, e um componente de resultado. A Maria tem toda razão — isso é a definição de feature enterrada por falta de uma tarde de wiring.

---

# DEBATE 2: Maria vs Lucas (10 rounds)
*Usuária frustrada vs Power user que contorna problemas*

---

## ROUND 1: Foto que não funciona

**Maria:** Mandei uma foto do flyer pro bot e ele não entendeu. A funcionalidade de foto parece existir só pra enfeitar.

**Lucas:** Tu encontrou um bug real. O handler copia a foto pra `.forgeclaw-uploads/`, monta o prompt — até aí certo. O problema é o `finally` na linha 57: ele DELETA a cópia local ANTES do Claude terminar de processar. Eu contorno mandando foto como documento (o document handler não deleta imagens no finally). Mas deveria ser corrigido: remover o unlink do finally e criar cleanup agendado.

---

## ROUND 2: Cron pelo Telegram

**Maria:** Quero criar cron direto pelo Telegram. Ter que abrir o dashboard pra isso quebra meu fluxo.

**Lucas:** Concordo 100% e é meu top 3 de frustração. A ironia é que o cron-engine já tem `naturalToCron()` que parseia "Todo dia às 8h" pra cron expression. E o `stateStore.createCronJob()` já aceita origem 'db'. Um comando `/cron_add Todo dia às 8h resumo dos emails` é factível em ~50 linhas. A infraestrutura tá lá, só falta o wiring.

---

## ROUND 3: Sem roles pra equipe

**Maria:** Quero compartilhar o bot com minha assistente mas ela teria acesso a TUDO. Não existe conceito de roles.

**Lucas:** O auth middleware do bot é binário: tá no allowedUsers ou não tá. O state-store tem user_id e workspace_id em todas as tabelas mas ninguém usa — tudo é 'default'. Meu workaround: criei um SEGUNDO grupo do Telegram com outro bot token. Bruto, mas funciona. A solução real seria um mapa `userRoles` no config e checar no middleware por ação.

---

## ROUND 4: Dashboard em inglês

**Maria:** O dashboard tá todo em inglês. "Harness", "Runtime" — minha equipe não entende nada.

**Lucas:** Não me incomoda pessoalmente, mas entendo. As tabs são hardcoded como strings. Zero i18n. Minha sugestão pragmática: simplesmente trocar os labels pra PT-BR direto no componente — "Sessões", "Automações", "Memória", "Config", "Personalidade". "Harness" virar "Personalidade" já resolve 80% da confusão. São literalmente 5 strings.

---

## ROUND 5: Memória por regex limitado

**Maria:** Eu digo "bot, lembra que o João prefere formal" mas o regex só pega se a frase COMEÇA com "lembra que". E não me confirma que salvou.

**Lucas:** A Maria tá parcialmente certa. Os regex patterns são `^lembr[ae]\s+que\s+(.+)` — o caret exige início da mensagem. "Bot, lembra que X" não dispara, mas "lembra que X" sim. Fácil corrigir: remover os `^` anchors. Sobre o feedback, ela tem razão total — o handler faz fire-and-forget e NUNCA informa o usuário. Adicionar um `ctx.reply('Salvo na memória.')` levaria 3 linhas.

---

## ROUND 6: Cron silencioso

**Maria:** Criei um cron "resumo diário às 8h". Hoje não recebi nada. Não sei se falhou, se não rodou, ou se o servidor caiu. Zero feedback.

**Lucas:** Esse é o tipo de coisa que só me pegou com 15 crons rodando. Se o bot tava offline ou houve exception ANTES do executeJob — silêncio total. O cron_logs registra 'running' mas se o processo morrer, fica eternamente 'running'. Minha sugestão: um cron de "health check" que roda a cada hora, verifica se os outros crons estão disparando conforme schedule, e manda alerta se algum pulou a janela.

---

## ROUND 7: Dashboard não responsivo

**Maria:** Abri o dashboard no celular — sidebar come 30% da tela, forms apertados.

**Lucas:** A sidebar tem largura fixa w-44/w-14, zero media queries, zero drawer mobile. Eu uso dashboard exclusivamente no desktop então nunca senti. Mas pra Maria, adicionar um `hidden md:flex` na sidebar e um hamburger menu mobile seria a correção mínima. Tailwind + shadcn já suportam isso nativamente.

---

## ROUND 8: Run Now sem feedback

**Maria:** Cliquei "Run Now" e não aconteceu nada no dashboard. Tive que ir pro Telegram ver o resultado. Parece quebrado.

**Lucas:** Não é quebrado, mas parece. Rastreei o fluxo inteiro: o dashboard faz IPC pro bot, o bot responde 202 Accepted, o resultado volta via WebSocket broadcast. O problema: o dashboard NÃO se subscriba ao canal 'cron' pra receber esses broadcasts. A infraestrutura WS tá lá, falta o frontend consumir.

---

## ROUND 9: Harness incompreensível

**Maria:** Quero customizar a personalidade mas a tab me mostra markdown cru. Eu não sei o que é system prompt.

**Lucas:** Concordo que é problema de UX. O harness é poderoso mas mostrar markdown cru pra quem não é técnico é hostil. Minha sugestão: formulário guiado com campos tipo "Nome do assistente", "Tom de voz", "Regras". Por baixo gera o CLAUDE.md. Não elimina a opção raw — só adiciona camada amigável. É o tipo de feature que multiplica adoção por 10x.

---

## ROUND 10: Sem busca em conversas

**Maria:** Tenho 8 clientes, centenas de conversas. Não consigo buscar "o que o bot respondeu sobre a GreenCo". Sem busca, sem filtro, sem tags.

**Lucas:** Essa é EXATAMENTE a feature que eu mais quero. A função searchMessages() no state-store JÁ EXISTE, JÁ FUNCIONA, com FTS5, BM25 ranking, sanitização de query. Está lá, implementada — e NINGUÉM EXPÕE ela. Criar um endpoint e uma barra de busca seria um dia de trabalho. É a feature com melhor relação esforço/impacto de todo o backlog. Com 50+ sessões, busca não é nice-to-have — é survival feature.

---

# CONSENSOS ENTRE OS 3 AGENTES

## Concordância unânime (todos concordam que é crítico):
1. **Busca global** — FTS5 existe mas não está exposta (M10, R9, L9)
2. **Foto quebrada** — arquivo deletado antes do Claude ler (M1)
3. **Feedback de memória** — fire-and-forget sem confirmar ao usuário (M5)
4. **Run Now sem output no dashboard** — WS broadcast existe mas frontend não consome (M8)
5. **Cron pelo Telegram** — naturalToCron() existe mas não há comando (M2)

## Divergências resolvidas:
- **Anchor do regex (M5):** Ricardo defende anchor por segurança, Lucas quer remover, Maria quer feedback. Solução: manter anchor + adicionar confirmação visual.
- **Mobile dashboard (M7):** Ricardo propõe Telegram como surface mobile, Maria quer dashboard responsivo, Lucas concorda que é mínimo. Solução: hamburger menu mobile + botões inline no Telegram.
- **Multi-tenant (M3):** Ricardo diz v2, Maria diz essencial, Lucas contorna com 2 bots. Solução pragmática: permissões por tópico sem full multi-tenant.

## Top 5 quick wins identificados (consenso dos 3):
1. Expor searchMessages() via API + barra de busca no dashboard (~1 dia)
2. Adicionar ctx.reply("Anotado na memória") após save bem-sucedido (~3 linhas)
3. Não deletar foto no finally, criar cleanup com TTL (~10 linhas)
4. Subscrever dashboard no canal WS 'cron' após Run Now (~2h)
5. Trocar 5 labels de tab pra PT-BR (~20 min)
