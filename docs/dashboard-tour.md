# Tour do Dashboard

O dashboard roda em `http://localhost:4040` e so aceita conexoes de localhost (voce mesmo). Autenticacao e via token gerado no install — ele vive em cookie httpOnly depois do login.

Sao 9 abas. Voce nao precisa visitar todas todo dia. A tabela abaixo e pra voce saber onde ir quando precisar.

![screenshot](./screenshots/dashboard-home.png)

## Sessoes

Lista todos os chats e topics do Telegram. Kanban com colunas (em progresso / idle). Abre o historico de mensagens de um topic e voce pode conversar dali — a mensagem vai pro mesmo Telegram do bot, com streaming.

Voce usa aqui para: acompanhar conversas em tempo real, ver historico longo (Telegram limita scroll), vincular um agente a um topic via dropdown.

![screenshot](./screenshots/tab-sessoes.png)

Detalhes sobre agentes em [agents.md](./agents.md).

## Automacoes

CRUD de cron jobs. Mostra jobs com origem `db` (criados no dashboard) e `file` (lidos do `~/.forgeclaw/HEARTBEAT.md`). Voce pode criar, editar, desativar, duplicar, executar agora (run-now). Jobs `file` sao read-only aqui — edite o arquivo direto. Logs de execucao (started_at, finished_at, status, output) ficam na mesma aba.

Voce usa aqui para: criar tarefas agendadas, ver o que cron X produziu ontem, executar um cron manualmente para testar.

![screenshot](./screenshots/tab-automacoes.png)

Guia completo em [crons.md](./crons.md).

## Memoria

Entradas da memoria persistente com busca FTS5 e paginacao (50 por pagina). Mostra daily logs, entradas de MEMORY.md e audit trail de edicoes automaticas (janitor).

Voce usa aqui para: buscar uma info que a IA sabia antes ("o que falei do cliente X em marco"), limpar memoria corrompida, auditar o que o janitor editou.

![screenshot](./screenshots/tab-memoria.png)

Mais sobre sistema de memoria em [harness-guide.md#memorymd](./harness-guide.md#memorymd).

## Agentes

CRUD de agentes especializados. Cada agente tem nome, prompt, memory mode (Global/Filtrada/Nenhuma), memory_domain_filter (tags) e default_runtime (Claude Code ou Codex).

Voce usa aqui para: criar um agente novo, ajustar prompt de um agente existente, trocar o modo de memoria.

![screenshot](./screenshots/tab-agentes.png)

Guia completo em [agents.md](./agents.md).

## Tokens

Chart de uso de tokens por dia/sessao. Breakdown cache vs fresh tokens. Top sessoes por consumo. Util se voce esta na assinatura Claude Max (limite mensal) ou paga API.

Voce usa aqui para: ver qual topic esta consumindo mais tokens, decidir se vale otimizar contexto, entender se cache esta funcionando.

![screenshot](./screenshots/tab-tokens.png)

## Atividade

Feed cronologico dos eventos do sistema: sessao criada, cron disparado, mensagem recebida, memoria salva, webhook entregue. Filtros por tipo. Atualizacao em tempo real via WebSocket.

Voce usa aqui para: debug ("por que o cron X nao rodou?"), onboarding mental do sistema (ver tudo acontecendo ao vivo), confirmar que um webhook foi entregue.

![screenshot](./screenshots/tab-atividade.png)

## Webhooks

CRUD de webhooks outbound. Cada webhook tem URL, lista de eventos que o disparam (session.created, cron.fired, cron.result, message.incoming, memory.created, etc.), secret HMAC-SHA256, flag enabled. Ve delivery logs (status code, payload, tentativas).

Voce usa aqui para: integrar ForgeClaw com N8N, Make, Zapier, ou seu proprio backend. Cada disparo tem retry com backoff exponencial.

![screenshot](./screenshots/tab-webhooks.png)

## Configuracoes

Visualiza o `forgeclaw.config.json` ativo. Campos sensiveis (botToken, dashboardToken) mascarados. Permite editar `allowedUsers`, `allowedGroups`, `timezone`, `workingDir`, `vaultPath`, `voiceProvider`, `claudeModel`, `defaultRuntime`. Tokens nao sao gravados quando mascarados (protecao contra acidente).

Voce usa aqui para: adicionar mais usuarios autorizados, trocar de Claude Max pra outro modelo, mudar timezone.

![screenshot](./screenshots/tab-config.png)

## Personalidade

Editor do harness. Abre os 6 arquivos (SOUL, USER, AGENTS, TOOLS, MEMORY, STYLE) + HEARTBEAT.md em abas. Salvar recompila o CLAUDE.md agregado. Efeito imediato na proxima chamada ao Claude — nao precisa reiniciar bot.

Voce usa aqui para: refinar o tom da IA, adicionar info pessoal no USER.md, editar crons em HEARTBEAT.md visualmente, ajustar guia de estilo.

![screenshot](./screenshots/tab-personalidade.png)

Guia editorial do harness em [harness-guide.md](./harness-guide.md).

---

## Atalhos globais

| Atalho | Funcao |
|--------|--------|
| `Cmd/Ctrl + K` | Busca global (procura em sessoes, memoria, agentes) |
| `Cmd/Ctrl + N` | Nova sessao/topic (quando em Sessoes) |
| `Esc` | Fecha modais e sheets |

## Seguranca

- Dashboard escuta so em `localhost:4040`. Acesso externo exige reverse proxy que voce mesmo configura (nao recomendado sem TLS + auth adicional).
- Token inicial gerado no install, guardado em `~/.forgeclaw/forgeclaw.config.json` campo `dashboardToken`.
- Se perdeu o token, rode `bun run cli status` ou `bun run cli token` para mostrar.

## Problemas comuns do dashboard

- [Dashboard nao abre (porta 4040 em uso)](./troubleshooting.md#porta-4040-em-uso)
- [Token invalido na pagina /login](./troubleshooting.md#token-dashboard-invalido)
- [Chart de tokens vazio](./troubleshooting.md#chart-tokens-vazio)
