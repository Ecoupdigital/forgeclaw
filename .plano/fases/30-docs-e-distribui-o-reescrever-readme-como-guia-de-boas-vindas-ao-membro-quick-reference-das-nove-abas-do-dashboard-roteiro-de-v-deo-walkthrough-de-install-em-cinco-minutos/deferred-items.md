# Deferred Items — Fase 30

## 30-03 Task 4: Captura real de screenshots (DEFERRED — checkpoint humano)

**Status:** Infraestrutura entregue (script + manifesto + diretorio), captura real nao executada neste ambiente.

**Por que deferido:** Task 4 foi marcada `type="checkpoint:human-action"` no plano porque a captura visual exige:

1. Ambiente interativo (dashboard rodando em `http://localhost:4040`, bot Telegram conectado, dados seed)
2. Configuracao real (`~/.forgeclaw/forgeclaw.config.json` com `dashboardToken`)
3. Telegram desktop aberto pra capturas manuais de conversa
4. Terminais abertos pra capturas de installer em progresso
5. Revisao humana das 27+ imagens contra o checklist de privacidade antes de commitar

Este ambiente executor e CLI sem display, sem dashboard rodando, sem config do ForgeClaw instalado, sem bot conectado. Instalar Playwright (~80MB de browsers) nao resolveria porque os pre-requisitos acima nao sao satisfeiveis sem intervencao humana — e o plano explicitamente pede pra **nao adicionar** Playwright como dep do projeto.

**Impacto:** Bloqueante pro **Plano 30-02 ficar visualmente completo** (docs ja referenciam os PNGs via placeholder `./screenshots/NOME.png`) e pro **alpha da Fase 31** (membros alpha recebem docs com screenshots em lugar). **Nao bloqueante** pra 30-03 marcar como completo — o plano foi escrito com `autonomous: false` exatamente pra reconhecer este fato, e o verify automatizado da Task 4 aceita zero PNGs como OK.

## Runbook pra Jonathan

Quando tiver 30-40 min pra capturar:

### 1. Preparar ambiente (5 min)

```bash
cd /home/projects/ForgeClaw

# Dashboard sobe em localhost:4040
cd packages/dashboard
bun run dev
# deixar rodando; abrir outro terminal:

cd /home/projects/ForgeClaw
# Bot (opcional pra screenshots do dashboard, essencial pra Telegram)
bun run dev:bot
```

Conferir:
- `~/.forgeclaw/forgeclaw.config.json` existe e tem `dashboardToken`
- `~/.forgeclaw/harness/` populado
- Dashboard responde em `http://localhost:4040/login` e entra com o token

### 2. Capturar dashboard automaticamente (5 min)

```bash
# Opcao A — instalar playwright temporariamente (NAO commitar o package.json):
bun add -d playwright
bunx playwright install chromium

export FORGECLAW_DASHBOARD_TOKEN=$(jq -r .dashboardToken ~/.forgeclaw/forgeclaw.config.json)
bun run scripts/capture-screenshots.ts

# Apos rodar, reverter package.json:
git checkout package.json bun.lockb
```

Isso deixa 13 PNGs em `docs/screenshots/`:
`dashboard-home.png`, `tab-sessoes.png`, `tab-automacoes.png`, `tab-memoria.png`, `tab-agentes.png`, `tab-tokens.png`, `tab-atividade.png`, `tab-webhooks.png`, `tab-config.png`, `tab-personalidade.png`, `agents-overview.png`, `crons-overview.png`, `harness-editor.png`.

### 3. Capturar manualmente (15-20 min)

As 14+ imagens restantes envolvem terminal, Telegram e installer em progresso. Pra cada uma:

**Terminal (`gnome-screenshot -a` ou `Cmd+Shift+4`):**

- `01-prerequisitos.png` — shell com `bun --version` + `claude --version`
- `02-installer-faseA.png` — `bun run cli install` mid-prompt do clack (input de token mascarado)
- `03-installer-faseB.png` — picker de arquetipo full screen
- `04-installer-faseC.png` — mensagem "Dashboard subiu em http://localhost:4040/onboarding"
- `07-bot-rodando.png` — `bun run dev:bot` com log "Bot started" visivel

**Telegram desktop:**

- `08-primeiro-hello.png` — conversa `/start` + resposta
- `09-topics-isolamento.png` — 2 topics mostrando contexto isolado
- `10-primeiro-cron.png` — Telegram recebendo output do run-now de um cron

**Dashboard (manual — complementa as automatizadas):**

- `05-onboarding-chat.png` — tela `/onboarding` com chat em progresso
- `06-onboarding-diff.png` — tela `/onboarding` no lado direito mostrando diff
- `11-primeiro-agente.png` — aba Agentes com "Editor de Copy" criado
- `archetype-picker.png`, `archetype-solo-builder.png`, `archetype-content-creator.png`, `archetype-agency-freela.png`, `archetype-ecom-manager.png`, `archetype-generic.png` — 6 PNGs do picker e dos cards
- `agents-create.png`, `agents-bind-topic.png` — form e dropdown de agentes
- `cron-form.png`, `crons-logs.png` — form e modal de logs de crons

Total esperado: **33-34 PNGs** em `docs/screenshots/`.

### 4. Revisar privacidade (5 min)

Checklist pra cada PNG (copiado de `docs/screenshots/README.md#privacidade`):

- [ ] Sem tokens reais visiveis
- [ ] Sem Telegram User IDs reais
- [ ] Sem nomes de cliente real
- [ ] Sem paths `/home/vault/...` ou com nome de empresa
- [ ] Sem API keys em .env
- [ ] Nome do usuario do shell trocado pra `user@demo` (ou usar shell reset)

Se algo aparecer: regravar, nao editar em post.

### 5. Commitar (2 min)

```bash
cd /home/projects/ForgeClaw
# confirmar que nenhum PNG passou de 400kb
find docs/screenshots -name '*.png' -size +400k
# se passar algum, rodar optipng:
optipng -o2 docs/screenshots/*.png

git add docs/screenshots/*.png
git commit -m "docs(30-03): capture 33 screenshots referenced by docs/"
```

## Acceptance

Jonathan confirma:
- [ ] 30+ PNGs em `docs/screenshots/`
- [ ] Checklist de privacidade rodado em cada um
- [ ] Tamanhos < 400kb
- [ ] Links em `docs/*.md` (30-02) resolvem visualmente quando abertos no GitHub/Obsidian

Isso desbloqueia a **Fase 31 Alpha** (membros recebem docs com imagens).
