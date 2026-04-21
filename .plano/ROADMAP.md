# Roadmap: ForgeClaw

## Fases

- [ ] **Fase 1: Core Foundation** - SessionManager + ClaudeRunner + StateStore + EventBus
- [ ] **Fase 2: Bot Telegram Basico** - grammy + sessoes por topico + streaming
- [ ] **Fase 3: Harness System** - 7 arquivos + CLAUDE.md orquestrador + HarnessLoader + ContextBuilder
- [ ] **Fase 4: Sistema de Memoria** - auto-memory + vault navigator + memory compiler + dreaming
- [ ] **Fase 5: UP Detection + Botoes** - UPDetector + action keyboards + botoes interativos
- [ ] **Fase 6: Voz + Arquivos** - voice transcription + file handling (inbound e outbound)
- [ ] **Fase 7: Sistema de Crons** - CronEngine + HEARTBEAT.md parser + hot reload
- [ ] **Fase 8: Dashboard Web** - Next.js 15 + Chat + Kanban + Crons + Memoria + Config + Harness _(DASH-04 subset concluido 2026-04-11; DASH-01/02/03/05/06/07 pendentes)_
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
| 8 | 6/6 (DASH-04 subset) | DASH-04 Done | 2026-04-11 |
| 9 | 0/? | Pendente | -- |
| 10 | 0/? | Pendente | -- |
| 11 | 0/? | Pendente | -- |
| 12 | 0/? | Pendente | -- |
| 13 | 0/? | Pendente | -- |

### Fase 11: Service & Environment Infrastructure (B1 + B2 + B5)
**Objetivo:** Instalar dashboard como serviço de sistema, criar env file com API keys, adicionar passo de bun install no installer.
**Depende de:** Fases 8, 9
**Requisitos:** [PKG-B1, PKG-B2, PKG-B5]
**Critérios de Sucesso:**
  1. Env file (~/.forgeclaw/.env) criado com API keys durante install
  2. Bot systemd service usa EnvironmentFile= para carregar env vars
  3. Dashboard systemd/launchd service criado e instalado pelo installer
  4. Dashboard roda em production mode (next build + next start)
  5. `bun install` executado automaticamente durante install com spinner
  6. Ambos serviços auto-start após install e reboot

### Fase 12: Voice & Harness Config (B3 + B4)
**Objetivo:** Corrigir voiceProvider com valores válidos, adicionar opção Groq, gerar CLAUDE.md harness compilado.
**Depende de:** Fase 11
**Requisitos:** [PKG-B3, PKG-B4]
**Critérios de Sucesso:**
  1. Installer oferece Groq (recomendado) + OpenAI + None para voz
  2. Config salva voiceProvider válido ('groq', 'openai', 'none')
  3. VoiceHandler respeita campo voiceProvider do config
  4. Installer coleta GROQ_API_KEY quando Groq selecionado
  5. CLAUDE.md gerado concatenando SOUL+USER+AGENTS+TOOLS+MEMORY+STYLE
  6. compileHarness() function existe para recompilação
  7. Bot verifica existência do CLAUDE.md no startup

### Fase 13: Dashboard Authentication (B6)
**Objetivo:** Adicionar autenticação por token no dashboard e WebSocket server.
**Depende de:** Fase 11
**Requisitos:** [PKG-B6]
**Critérios de Sucesso:**
  1. Token aleatório gerado durante install
  2. Token salvo em config como `dashboardToken`
  3. Next.js middleware valida cookie de token em todas rotas exceto /login
  4. Página /login aceita token e seta cookie
  5. API routes validam token via header ou cookie
  6. WS server valida token no upgrade request
  7. Token exibido ao usuário após install

### Fase 14: Quick Fixes — Mock Data, Claude Path, Typing (H1 + H5 + H9)
**Objetivo:** Correções triviais/pequenas que impactam primeira impressão do cliente.
**Depende de:** —
**Requisitos:** [HIG-H1, HIG-H5, HIG-H9]
**Critérios de Sucesso:**
  1. APIs retornam arrays vazios quando DB falha (não mock data)
  2. Claude CLI fallback é 'claude' (não /root/.local/bin/claude)
  3. Bot envia typing indicator durante processamento do Claude

### Fase 15: Data Integrity — Cron Logs, Session Keys, Config Safety (H2 + H3 + H4)
**Objetivo:** Corrigir bugs de integridade de dados que acumulam problemas.
**Depende de:** —
**Requisitos:** [HIG-H2, HIG-H3, HIG-H4]
**Critérios de Sucesso:**
  1. Cron execução cria UMA entry de log (não duas)
  2. Session keys sempre no formato "chatId:topicId" (0 para DMs)
  3. writeConfig() nunca sobrescreve tokens mascarados

### Fase 16: UX Improvements — Cron Output, Memory Search, Timezone (H7 + H8 + H10)
**Objetivo:** Melhorias de UX no dashboard: output de cron visível, busca de memória, timezone configurável.
**Depende de:** —
**Requisitos:** [HIG-H7, HIG-H8, HIG-H10]
**Critérios de Sucesso:**
  1. Output de cron visível na aba de logs do dashboard
  2. Memory tab tem campo de busca FTS5 e paginação (50/page)
  3. Timezone lida do config com default America/Sao_Paulo

### Fase 17: Immediate Memory Save (H6)
**Objetivo:** Detectar pedidos explícitos de memória e salvar imediatamente.
**Depende de:** —
**Requisitos:** [HIG-H6]
**Critérios de Sucesso:**
  1. Frases "lembra que", "remember that" etc. detectadas no input
  2. Memory entry criada imediatamente via memoryManagerV2
  3. Usuário recebe confirmação que a memória foi salva

### Fase 18: Core Hardening (M1 + M2 + M3 + M8 + M10)
**Objetivo:** Corrigir defaults hardcoded, consolidar memory system, documentar flags, checar versão Bun, mensagens de erro amigáveis.
**Depende de:** —
**Requisitos:** [MED-M1, MED-M2, MED-M3, MED-M8, MED-M10]
**Critérios de Sucesso:**
  1. Daily log default é ~/.forgeclaw/memory/daily (não /home/vault)
  2. Memory v1 deprecated — v2 é o único sistema ativo
  3. --dangerously-skip-permissions documentado e configurável
  4. Installer checa versão mínima do Bun (1.1.0)
  5. Erros do Claude CLI traduzidos para mensagens amigáveis

### Fase 19: Dashboard Safety & UX (M4 + M6 + M9)
**Objetivo:** Config validation, cron failure highlight, user management no dashboard.
**Depende de:** —
**Requisitos:** [MED-M4, MED-M6, MED-M9]
**Critérios de Sucesso:**
  1. PUT /api/config valida campos contra whitelist
  2. Cron failures têm prefixo visual claro no Telegram
  3. allowedUsers/allowedGroups editáveis no config tab

### Fase 20: Data Export & Photo Handling (M5 + M7)
**Objetivo:** Comando forgeclaw export + fotos copiadas para workingDir.
**Depende de:** —
**Requisitos:** [MED-M5, MED-M7]
**Critérios de Sucesso:**
  1. `forgeclaw export` gera .tar.gz com db + config + harness + memory
  2. Fotos enviadas ao bot são copiadas para workingDir antes de enviar ao Claude

### Fase 21: Mission Control (Token Tracking + Activity Feed + Webhooks)
**Objetivo:** Adicionar 3 features de observabilidade e integração inspiradas em mission-control: tracking de tokens por sessão/dia, feed de atividades unificado em tempo real, e webhooks outbound com retry e assinatura HMAC.
**Depende de:** Fase 8
**Requisitos:** [MC-01, MC-02, MC-03, MC-04, MC-05, MC-06, MC-07, MC-08, MC-09]
**Critérios de Sucesso:**
  1. Cada stream:done persiste input_tokens, output_tokens, cache_creation, cache_read na tabela token_usage
  2. Dashboard aba Tokens mostra uso diário (chart), top sessões, breakdown cache vs fresh
  3. Tabela activities registra eventos do sistema (sessão, cron, mensagem, memória)
  4. Dashboard mostra feed de atividades cronológico com atualização em tempo real via WebSocket
  5. Webhooks configuráveis via dashboard com CRUD, HMAC-SHA256, retry com backoff
  6. Webhook dispatcher dispara em background quando activity é criada

### Fase 22: Agentes Especializados + Memória por Topic
**Objetivo:** Permitir que cada topic do Telegram tenha um agente com prompt base próprio e filtro de memória por tags, eliminando repetição de contexto entre topics. Inclui edição via dashboard.
**Depende de:** Fase 8
**Requisitos:** [AGT-01, AGT-02, AGT-03, AGT-04, AGT-05, AGT-06, AGT-07, AGT-08]
**Critérios de Sucesso:**
  1. Tabela agents existe com name, system_prompt, memory_mode, memory_domain_filter, default_runtime
  2. CRUD de agentes funciona via API e dashboard (aba Agentes)
  3. Topic pode ser vinculado a um agente via agent_id (dropdown no dashboard)
  4. system_prompt do agente é prepended ao harness CLAUDE.md antes de cada chamada
  5. memory_mode='filtered' injeta só memórias com tags matching memory_domain_filter do agente
  6. memory_mode='global' mantém comportamento atual (injeta tudo)
  7. Criar topic novo já permite selecionar agente

### Fase 23: Auditoria de Despersonalização — mapear e expurgar contexto pessoal do repo (harness, HEARTBEAT, memória, skills) antes de distribuir

**Objetivo:** Scanner automatizado + cleanup + CI guard para garantir zero PII no repo antes de distribuir via comunidade.
**Requisitos**: TBD
**Depende de:** Fase 22
**Planos:** 3/3 plans complete
  - [x] 23-01 — Auditoria automatizada de contexto pessoal (scanner + relatório + checklist)
  - [x] 23-02 — Execução do cleanup (consome CLEANUP-CHECKLIST.md)
  - [x] 23-03 — CI guard + allowlist auditável + pre-commit hook opt-in (workflow GH Actions em push/PR bloqueia regressão)

### Fase 24: Templates por Arquétipo — cinco perfis (Solo Builder, Criador de Conteúdo, Agência/Freela, Gestor E-commerce, Genérico) com harness completo genérico por arquétipo

**Objetivo:** [A ser planejado]
**Requisitos**: TBD
**Depende de:** Fase 23
**Planos:** 1/3 plans executed

### Fase 25: CLI Installer em Duas Fases — fase técnica valida Claude Code CLI autenticado e credenciais, escolha de arquétipo popula harness, sobe dashboard em modo onboarding

**Objetivo:** [A ser planejado]
**Requisitos**: TBD
**Depende de:** Fase 24
**Planos:** 0 planos

### Fase 26: Persona Entrevistador ForgeClaw — system prompt fixo no produto com roteiro por arquétipo, output em diff estruturado do harness, bounded em turnos e tokens

**Objetivo:** [A ser planejado]
**Requisitos**: TBD
**Depende de:** Fase 25
**Planos:** 0 planos

### Fase 27: Dashboard First-run Onboarding — rota onboarding com chat conversacional à esquerda e preview ao vivo dos arquivos do harness à direita até existir sentinel .onboarded

**Objetivo:** [A ser planejado]
**Requisitos**: TBD
**Depende de:** Fase 26
**Planos:** 0 planos

### Fase 28: Comando forgeclaw refine — CLI command que reexecuta a entrevista depois do install pra refinar harness sem reinstalar o produto

**Objetivo:** [A ser planejado]
**Requisitos**: TBD
**Depende de:** Fase 27
**Planos:** 0 planos

### Fase 29: Gate de Acesso pela Comunidade — v1 simples com repo privado e invite manual no GitHub ao assinar comunidade, documentação de fluxo de concessão e revogação

**Objetivo:** [A ser planejado]
**Requisitos**: TBD
**Depende de:** Fase 28
**Planos:** 0 planos

### Fase 30: Docs e Distribuição — reescrever README como guia de boas-vindas ao membro, quick reference das nove abas do dashboard, roteiro de vídeo walkthrough de install em cinco minutos

**Objetivo:** [A ser planejado]
**Requisitos**: TBD
**Depende de:** Fase 29
**Planos:** 0 planos

### Fase 31: Alpha com Cinco Membros da Comunidade — seleção de perfis diferentes, observação de instalação sem ajudar, coleta de friction points, iteração antes do release geral

**Objetivo:** [A ser planejado]
**Requisitos**: TBD
**Depende de:** Fase 30
**Planos:** 0 planos
