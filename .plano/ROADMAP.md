# Roadmap: ForgeClaw

## Fases

- [ ] **Fase 1: Core Foundation** - SessionManager + ClaudeRunner + StateStore + EventBus
- [ ] **Fase 2: Bot Telegram Basico** - grammy + sessoes por topico + streaming
- [ ] **Fase 3: Harness System** - 7 arquivos + CLAUDE.md orquestrador + HarnessLoader + ContextBuilder
- [ ] **Fase 4: Sistema de Memoria** - auto-memory + vault navigator + memory compiler + dreaming
- [ ] **Fase 5: UP Detection + Botoes** - UPDetector + action keyboards + botoes interativos
- [ ] **Fase 6: Voz + Arquivos** - voice transcription + file handling (inbound e outbound)
- [ ] **Fase 7: Sistema de Crons** - CronEngine + HEARTBEAT.md parser + hot reload
- [ ] **Fase 8: Dashboard Web** - Next.js 15 + Chat + Kanban + Crons + Memoria + Config + Harness
- [ ] **Fase 9: Instalador CLI** - npx forgeclaw install + onboarding + systemd/launchd
- [ ] **Fase 10: Testes E2E + Documentacao** - testes completos + README + docs

## Detalhes das Fases

### Fase 1: Core Foundation
**Objetivo:** Estabelecer a fundacao do monorepo e os 4 modulos core que todo o sistema depende -- SessionManager, ClaudeRunner, EventBus e StateStore -- com SQLite funcional e o Claude CLI respondendo via subprocess.
**Depende de:** Nothing
**Requisitos:** [SETUP-01, SETUP-02, SETUP-03, SETUP-04, CORE-01, CORE-02, CORE-03, CORE-04]
**Criterios de Sucesso:**
  1. `bun install` roda sem erros no monorepo, packages/core exporta todos os modulos
  2. ClaudeRunner spawna o claude CLI, recebe streaming NDJSON, callbacks tipados disparam na ordem correta
  3. SessionManager cria, persiste e resume sessoes em SQLite com chave composta chat_id:topic_id
  4. EventBus publica e entrega eventos tipados a subscribers registrados
  5. StateStore persiste e recupera dados de todas as 5 tabelas do schema

### Fase 2: Bot Telegram Basico
**Objetivo:** Criar o bot Telegram funcional com grammy, isolamento perfeito entre topicos, streaming de respostas e controle de fluxo (fila, interrupt, whitelist).
**Depende de:** Fase 1
**Requisitos:** [BOT-01, BOT-02, BOT-03, BOT-04, BOT-05, BOT-06]
**Criterios de Sucesso:**
  1. Mensagem no topico A gera sessao A, mensagem no topico B gera sessao B -- nunca cruzam
  2. SESSION_ID persiste apos restart do bot (--resume funciona)
  3. Resposta do Claude aparece com streaming (edits progressivos) no Telegram
  4. Usuario nao autorizado recebe rejeicao, nao chega ao Claude
  5. Segunda mensagem enquanto Claude processa entra na fila FIFO e e processada apos a primeira

### Fase 3: Harness System
**Objetivo:** Implementar o sistema de harness com 7 arquivos de configuracao de personalidade/comportamento, loader com cache e context builder que injeta tudo antes de cada chamada ao Claude.
**Depende de:** Fase 2
**Requisitos:** [HARNESS-01, HARNESS-02, HARNESS-03, HARNESS-04]
**Criterios de Sucesso:**
  1. Os 7 arquivos de harness existem em ~/.forgeclaw/harness/ com formato documentado
  2. HarnessLoader le todos os arquivos e cacheia por mtime (nao rele se nao mudou)
  3. ContextBuilder monta prompt completo com harness + historico de sessao e passa ao ClaudeRunner
  4. Alteracao em qualquer harness file e refletida na proxima chamada (sem restart)

### Fase 4: Sistema de Memoria
**Objetivo:** Implementar memoria persistente com extracao automatica de insights, navegacao do Obsidian vault para contexto, daily logs e consolidacao periodica (dreaming).
**Depende de:** Fase 3
**Requisitos:** [MEM-01, MEM-02, MEM-03, MEM-04]
**Criterios de Sucesso:**
  1. Apos cada conversa, insights relevantes sao extraidos e adicionados ao MEMORY.md
  2. VaultNavigator busca notas no Obsidian vault por relevancia e injeta como contexto
  3. Memory compiler gera daily log consolidando todas as interacoes do dia
  4. Dreaming roda em periodo idle e reorganiza/consolida MEMORY.md

### Fase 5: UP Detection + Botoes
**Objetivo:** Detectar patterns /up:* e opcoes numeradas no output do Claude e transforma-los em botoes inline tapeaeis no Telegram.
**Depende de:** Fase 2
**Requisitos:** [UP-01, UP-02, UP-03]
**Criterios de Sucesso:**
  1. Quando Claude responde com /up:executar-fase 3, um botao "Executar Fase 3" aparece no Telegram
  2. Quando Claude responde com opcoes numeradas (1. X, 2. Y), botoes correspondentes aparecem
  3. Clicar no botao envia o comando/opcao como nova mensagem ao Claude na mesma sessao

### Fase 6: Voz + Arquivos
**Objetivo:** Suportar mensagens de voz (transcricao via Whisper) e handling de arquivos inbound (PDF, imagens, archives) e outbound (arquivos gerados pelo Claude).
**Depende de:** Fase 2
**Requisitos:** [VOICE-01, FILE-01, FILE-02]
**Criterios de Sucesso:**
  1. Mensagem de voz e transcrita e o texto e enviado ao Claude automaticamente
  2. PDF enviado e extraido via pdftotext e conteudo passado ao Claude
  3. Imagem enviada tem path local passado ao Claude (multimodal)
  4. Arquivo .zip/.tar.gz enviado e extraido, conteudo texto passado ao Claude
  5. Quando Claude gera arquivo, este e enviado de volta ao usuario no Telegram

### Fase 7: Sistema de Crons
**Objetivo:** Implementar scheduling de tarefas periodicas com parsing de HEARTBEAT.md, execucao via ClaudeRunner one-shot, hot reload e roteamento de resultados para topicos configurados.
**Depende de:** Fase 2, Fase 3
**Requisitos:** [CRON-01, CRON-02, CRON-03, CRON-04]
**Criterios de Sucesso:**
  1. Job com schedule "0 9 * * *" dispara as 9h e executa prompt via Claude CLI
  2. Resultado do cron chega no topico Telegram configurado como target
  3. Editar HEARTBEAT.md atualiza jobs em runtime sem restart
  4. Log de execucao (started_at, finished_at, status, output) persiste na tabela cron_logs

### Fase 8: Dashboard Web
**Objetivo:** Criar dashboard web completo em Next.js 15 com chat streaming, kanban de sessoes, gerenciamento de crons, visualizacao de memoria, configuracao e edicao de harness -- tudo com atualizacao real-time via WebSocket.
**Depende de:** Fase 1, Fase 3, Fase 4, Fase 7
**Requisitos:** [DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07]
**Criterios de Sucesso:**
  1. Dashboard acessivel em localhost:3000, rejeita conexoes externas
  2. Chat funciona com streaming bidirecional (digitar mensagem, ver resposta em tempo real)
  3. Kanban mostra sessoes/topicos e atualiza em < 1s quando estado muda
  4. CRUD de crons funciona e reflete no CronEngine sem restart
  5. Edicao de harness salva os arquivos e efeito e imediato na proxima chamada ao Claude

### Fase 9: Instalador CLI
**Objetivo:** Criar instalador CLI interativo que guia o usuario pelo onboarding completo: verificacao de dependencias, configuracao, harness defaults e setup de servico para auto-start.
**Depende de:** Fase 1
**Requisitos:** [CLI-01, CLI-02, CLI-03, CLI-04]
**Criterios de Sucesso:**
  1. `npx forgeclaw install` roda em Ubuntu 22.04 limpo e completa o onboarding
  2. Dependencias faltantes sao detectadas e instrucoes de instalacao fornecidas
  3. forgeclaw.config.json e gerado com todos os campos necessarios
  4. Servico systemd (ou launchd no macOS) e configurado e sobe no boot

### Fase 10: Testes E2E + Documentacao
**Objetivo:** Garantir cobertura de testes em todos os modulos criticos e documentar completamente a arquitetura, setup e APIs do sistema.
**Depende de:** Fase 1-9
**Requisitos:** [TEST-01, TEST-02, TEST-03, TEST-04, DOC-01, DOC-02, DOC-03]
**Criterios de Sucesso:**
  1. Testes unitarios do core passam com >= 80% de cobertura
  2. Teste de integracao valida fluxo completo mensagem-resposta
  3. README explica arquitetura, setup e configuracao de forma clara
  4. Documentacao do harness system permite personalizar sem ler codigo
  5. Documentacao da API WebSocket permite construir clientes alternativos

## Tabela de Progresso

| Fase | Planos Completos | Status | Completado |
|------|-----------------|--------|------------|
| 1 | 0/? | Pendente | -- |
| 2 | 0/? | Pendente | -- |
| 3 | 0/? | Pendente | -- |
| 4 | 0/? | Pendente | -- |
| 5 | 0/? | Pendente | -- |
| 6 | 0/? | Pendente | -- |
| 7 | 0/? | Pendente | -- |
| 8 | 2/6 | In Progress|  |
| 9 | 0/? | Pendente | -- |
| 10 | 0/? | Pendente | -- |
