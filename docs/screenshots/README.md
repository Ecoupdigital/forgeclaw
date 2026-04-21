# Screenshots

Esta pasta contem as imagens referenciadas pelos arquivos em `docs/`.

## Como capturar

- **Automatico (dashboard):** `bun run scripts/capture-screenshots.ts` captura as 12 telas do dashboard via Playwright (requer `bunx playwright install`).
- **Manual (Telegram e terminal):** use ferramenta nativa do OS (`Cmd+Shift+4` no macOS, `gnome-screenshot -a` no Linux). Salvar PNG, dimensao 1280x720 ou proximo.

## Manifesto

### Getting Started (docs/getting-started.md)

| Arquivo | Mostra |
|---------|--------|
| `01-prerequisitos.png` | Terminal com `bun --version`, `claude --version` confirmando pre-reqs |
| `02-installer-faseA.png` | Installer Fase A: clack prompt pedindo bot token (mascarado) |
| `03-installer-faseB.png` | Installer Fase B: picker de arquetipo com 5 opcoes |
| `04-installer-faseC.png` | Installer Fase C: mensagem de handoff + URL do onboarding |
| `05-onboarding-chat.png` | Dashboard /onboarding com chat da persona entrevistadora |
| `06-onboarding-diff.png` | Dashboard /onboarding com preview de diff do harness |
| `07-bot-rodando.png` | Terminal com `bun run dev:bot` logando start |
| `08-primeiro-hello.png` | Telegram com primeira mensagem `/start` respondida |
| `09-topics-isolamento.png` | Telegram com 2 topics recebendo respostas diferentes |
| `10-primeiro-cron.png` | Dashboard Automacoes com cron recem criado |
| `11-primeiro-agente.png` | Dashboard Agentes com Editor de Copy criado |

### Archetypes (docs/archetypes.md)

| Arquivo | Mostra |
|---------|--------|
| `archetype-picker.png` | Picker do installer Fase B full screen |
| `archetype-solo-builder.png` | Card detalhe do arquetipo Solo Builder |
| `archetype-content-creator.png` | Card detalhe do Criador de Conteudo |
| `archetype-agency-freela.png` | Card detalhe de Agencia/Freela |
| `archetype-ecom-manager.png` | Card detalhe de Gestor E-commerce |
| `archetype-generic.png` | Card detalhe do Generico |

### Dashboard Tour (docs/dashboard-tour.md)

| Arquivo | Mostra |
|---------|--------|
| `dashboard-home.png` | Home do dashboard (landing logado) |
| `tab-sessoes.png` | Aba Sessoes com kanban e chat aberto |
| `tab-automacoes.png` | Aba Automacoes com lista de crons e logs |
| `tab-memoria.png` | Aba Memoria com busca FTS5 e paginacao |
| `tab-agentes.png` | Aba Agentes com formulario aberto |
| `tab-tokens.png` | Aba Tokens com chart diario |
| `tab-atividade.png` | Aba Atividade com feed em tempo real |
| `tab-webhooks.png` | Aba Webhooks com 2-3 webhooks e logs |
| `tab-config.png` | Aba Configuracoes com campos editaveis |
| `tab-personalidade.png` | Aba Personalidade com editor do SOUL.md aberto |

### Harness Guide (docs/harness-guide.md)

| Arquivo | Mostra |
|---------|--------|
| `harness-editor.png` | Editor com abas dos 6 arquivos, SOUL em primeiro plano |

### Agents (docs/agents.md)

| Arquivo | Mostra |
|---------|--------|
| `agents-overview.png` | Lista de 3-4 agentes criados |
| `agents-create.png` | Formulario de criacao de agente |
| `agents-bind-topic.png` | Dropdown de agente num card de topic |

### Crons (docs/crons.md)

| Arquivo | Mostra |
|---------|--------|
| `crons-overview.png` | Lista de crons com badges origin `db` e `file` |
| `cron-form.png` | Form de cron com preview e proximos disparos |
| `crons-logs.png` | Modal de logs de execucao de um cron |

## Dimensoes e formato

- Dashboard: **1440x900** (resolucao boa pra screenshot em retina sem borrao)
- Telegram: **720x1280** (portrait), ou 1280x720 se landscape
- Terminal: **1200x800** (equivalente a terminal fullscreen em laptop)
- Formato: **PNG** sempre, sem compressao com perda
- Tamanho alvo: **< 400kb por arquivo** (usar `optipng` se ficar grande)

## Privacidade

Antes de commitar um screenshot:

- [ ] Sem tokens reais visiveis
- [ ] Sem Telegram User IDs reais
- [ ] Sem nomes de cliente real
- [ ] Sem paths `/home/<meu-user>/...` (usar `/home/demo/...` em fake account)
- [ ] Sem API keys em .env
