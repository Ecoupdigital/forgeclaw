# Fase 8: Dashboard Web - Contexto

**Reunido:** 2026-04-11
**Status:** Pronto para planejamento
**Escopo desta sessao:** Sub-recorte da Fase 8 focado em completar DASH-04 (UI de gerenciamento de cron jobs). Outros sub-criterios da Fase 8 (chat, kanban, memoria, config, harness) ficam fora deste contexto.

<domain>
## Limite da Fase (recorte da sessao)

Entregar uma **UI clara de criacao e gestao de cron jobs** no dashboard Next.js 15, completando o sub-criterio DASH-04 da Fase 8. O backend (`core.createCronJob`, `POST /api/crons`, CronEngine com HEARTBEAT.md parser da Fase 7) ja funciona -- o gap e o caminho visual para o usuario criar e gerenciar jobs sem abrir HEARTBEAT.md cru.

**Dentro do escopo:**
- Form de criacao de cron (novo modal/sheet) com todos os campos relevantes
- Edit, Delete, Duplicate de crons DB-origin
- Badge visual de origem (file vs db) nos cards
- Validacao e preview do schedule cron
- Helper visual indicando skills e template vars disponiveis no prompt
- Empty state acionavel
- Substituicao runtime de template vars (`{today}`, `{yesterday}`, `{now}`) no CronEngine -- cross-cutting com Fase 7
- Endpoint `GET /api/skills` que le `~/.claude/skills/` e retorna lista

**Fora do escopo (deferidos):**
- Fix do run_now do dashboard (requer IPC entre processo dashboard e bot)
- Outros sub-criterios DASH-01/02/03/05/06/07 da Fase 8
- Scope creep de nova capacidade de cron (chaining, templates compartilhados, etc.)

</domain>

<decisions>
## Decisoes de Implementacao

### Fonte de verdade (storage)
- **DB como origem principal, HEARTBEAT.md coexiste.** Form grava via `POST /api/crons` (ja existente) direto no SQLite. HEARTBEAT.md continua funcionando via parser da Fase 7 para jobs file-based.
- **HEARTBEAT vence em conflito.** Se um job file-origin e DB-origin tem o mesmo identificador, declarative config (arquivo) sobrescreve DB na proxima reload.
- **Hot reload so afeta file-origin.** Quando HEARTBEAT.md muda, CronEngine troca APENAS jobs com `origin='file'`. Jobs com `origin='db'` ficam intocados.
- **Dashboard-origin tambem sao escritos numa secao dedicada do HEARTBEAT.md** (ex: `## Managed by Dashboard`) para ficarem versionados no git. MAS o parser ignora explicitamente essa secao na releitura -- a secao e apenas mirror de visibilidade, nao fonte de verdade funcional. O DB continua sendo source-of-truth para esses jobs.
- **Durabilidade:** jobs DB-origin persistem em SQLite local. Git backup vem via o mirror na secao dedicada do HEARTBEAT.md.
- **Editor raw do HEARTBEAT.md escondido por padrao, bot\u00e3o "Advanced" abre drawer/sheet.** Usuario comum ve apenas lista + bot\u00e3o "+ Novo cron". Power-user clica "Advanced".
- **Logs orf\u00e3os:** quando um cron file-origin e removido do HEARTBEAT.md, o job some da lista mas os `cron_logs` permanecem no DB para auditoria. Adicionar uma view secundaria "Archived crons" (sem prioridade -- pode virar fase propria se ficar complexo).

**Requer no schema:** campo `origin ENUM('file','db')` e `source_file TEXT NULL` na tabela `cron_jobs` (se ainda nao existe). Planner deve verificar.

### UX do schedule
- **Presets fixos curados + "Custom"**. Lista de presets na criacao:
  - Every hour (`0 * * * *`)
  - Every day at 9am (`0 9 * * *`)
  - Every weekday morning (`0 8 * * 1-5`)
  - Every Monday 9am (`0 9 * * 1`)
  - Custom (abre text field)
- **Sem "save as preset"**. Bibliotheca de presets e fixa.
- **Validacao dupla (client + server).** Client valida on-the-fly com `cron-parser` (ja decidido no PROJECT.md). Server revalida no POST. Defense-in-depth.
- **Bot\u00e3o Save desabilitado enquanto invalido + mensagem inline em vermelho.** Impossibilita submit errado.
- **Preview duplo:** linha human-readable (via `cronstrue`) + proximas 3 execucoes calculadas pelo `cron-parser`. Ambos abaixo do input, atualizados em tempo real.
- **Timezone:** TZ local da maquina onde ForgeClaw roda. `0 9 * * *` = 9h no relogio local. Mostrar qual TZ esta sendo usada perto do input (texto pequeno tipo "Timezone: America/Sao_Paulo").
- **Suporte a macros cron** (`@hourly`, `@daily`, `@weekly`, `@monthly`, `@yearly`). cron-parser suporta nativamente.

### Campos do form
Obrigatorios:
- **Name** -- identificador humano (texto, required)
- **Schedule** -- com todo o tratamento da area 2
- **Prompt** -- textarea simples com contador de caracteres. Placeholder sugestivo: `Ex: Use /up:progresso e me envie um resumo do dia. Disponivel: {today}, {yesterday}, {now}.` Link abaixo "Skills disponiveis" abre sheet lateral com lista dinamica de skills.

Opcionais:
- **Target topic** -- dropdown dos topics conhecidos do DB (tabela `topics`), primeira opcao "Default (use harness default)". Raw `topic_id` input no "Advanced". Valor `null` = usar default.
- **Enabled** -- toggle, default `true`.

### Template vars no prompt (cross-cutting Fase 7)
- **Incluir agora.** Substituicao runtime de `{today}`, `{yesterday}`, `{now}` no prompt do cron antes de passar ao ClaudeRunner.
- **Formato ISO local** (ex: `2026-04-11`). `{now}` inclui hora (`2026-04-11T10:58`).
- **IMPORTANTE -- cross-cutting:** planner precisa coordenar duas mudancas:
  1. Logica de substituicao no CronEngine (codigo da Fase 7) antes de enviar ao ClaudeRunner
  2. Hint visual no form do dashboard com as vars suportadas
- Nao adicionar novas vars alem dessas 3 nesta sessao -- qualquer expansao vira proxima fase.

### Skills no prompt
- Cron prompts **podem** chamar skills (`/up:progresso`, `/commit`, etc.) porque rodam pelo mesmo ClaudeRunner que o bot. Placeholder do textarea sugere isso.
- **Endpoint novo `GET /api/skills`** le `~/.claude/skills/` dinamicamente e retorna lista com `name` e `description` para popular a sheet lateral do helper.
- `/up:*` sao skills como outras -- tratamento uniforme, sem secao especial.
- **Caveat importante** (o planner deve lembrar): skills que dependem de `AskUserQuestion` nao fazem sentido em cron sem input interativo. Documentar mas nao bloquear.

### Acoes CRUD
- **Create, Edit, Delete, Duplicate** entram no escopo. **Fix do Run Now NAO entra** (deferido -- requer IPC dashboard<->bot).
- **Edit/Delete apenas para DB-origin.** Cards file-origin tem botoes desabilitados com tooltip `"Edit in HEARTBEAT.md"`.
- **Duplicate funciona em ambos** -- cria um novo DB job pre-preenchido com os campos do original (file ou db) e abre o form.
- **Confirmacao de delete:** modal nomeado (`"Delete cron <name>? This cannot be undone."` + Cancel/Delete).
- **Empty state:** ilustracao + botao `"+ Create your first cron"` que abre o form direto.

### Pos-save
- Fecha o form, toast `"Cron created"`, job aparece na lista. Destaque visual sutil (pulse de 3s) no card recem-criado. Se for edit, destaque com `"Updated"`.

### Visual / distincao de origem
- **Badge pequeno no card:** `file` (cor neutra, ex: cinza-violeta) ou `db` (cor de acento, ex: violeta forte). Consistente com design system atual (violet/deep-space).
- Sem abas separadas. Tudo na mesma lista, ordenado por proximo disparo.

### Criterio do Claude (o planner decide)
- Biblioteca especifica para cron preview human-readable: recomendacao `cronstrue` (pequeno, zero deps), mas o planner pode escolher outra.
- Layout exato do form (modal vs sheet vs drawer) -- recomenda sheet lateral direita para nao cobrir a lista atual, mas livre para escolher.
- Como destacar visualmente o card recem-criado (pulse, glow, animate-in) -- livre.
- Estrutura do endpoint `/api/skills` (cache, TTL, formato exato da resposta) -- livre, mas deve ser rapido.

</decisions>

<specifics>
## Ideias Especificas

- **Pergunta levantada pelo usuario:** "quero saber se posso no prompt falar a skill que quero que ele use?" -- SIM, e isso virou decisao de design explicita. Ver secao "Skills no prompt" em decisions. O placeholder do textarea e o link "Skills disponiveis" existem exatamente para responder essa duvida dentro do produto.

- **Crons ja funcionam no backend (per memoria 2026-04-09):** "Implemented a functional Crons dashboard with live database integration and job management controls". O gap e apenas a UX de criacao -- nao precisa reimplementar a listagem ou a camada de dados.

- **Next.js versao custom neste package.** `packages/dashboard/AGENTS.md` avisa: "This is NOT the Next.js you know. This version has breaking changes -- read node_modules/next/dist/docs/ before writing any code." **O planner deve consultar `node_modules/next/dist/docs/` antes de propor forms, server actions, route handlers ou data fetching patterns.**

- **Stack de UI ja estabelecida:** shadcn/ui (ja tem `Button`, `Textarea`, `Separator`, `Card`, `Input`, `Dialog`, `Sheet`, `Dropdown`, `Tabs`, `Badge`). Form deve reutilizar esses componentes, nao introduzir nova biblioteca.

- **Design tokens existentes:** `violet`, `violet-dim`, `text-primary`, `text-secondary`, `text-body`, `night-panel`, `deep-space`. Usar esses. Nao inventar cores novas.

- **API POST /api/crons ja aceita** `{name, schedule, prompt, targetTopicId, enabled}`. Schema ja bate com os campos obrigatorios decididos. Pode ser que precise adicionar `origin: 'db'` no payload e no schema -- planner valida.

- **cron-parser e cronstrue** precisam entrar como deps do package `dashboard` (nao do core).

- **`/api/skills` endpoint novo** -- planejar localizacao (`packages/dashboard/src/app/api/skills/route.ts`), leitura de `~/.claude/skills/` via `fs.readdir`, parsing do YAML frontmatter de cada skill para extrair `name` + `description`.

</specifics>

<deferred>
## Ideias Adiadas

- **Fix do Run Now manual pelo dashboard.** Requer IPC entre processo dashboard e processo bot (ClaudeRunner so existe no bot). Ideia: WebSocket command channel ou fila compartilhada via DB. Virar fase propria quando priorizado.
- **"Save as preset" -- biblioteca de presets custom por usuario.** Baixa prioridade.
- **Template vars alem das 3 basicas** (`{topic_name}`, `{last_run_output}`, etc.). Expansao futura.
- **Editor de prompt rico** com markdown preview, syntax highlight, autocomplete de skills. Fase futura de DX.
- **View "Archived crons"** para jobs removidos com logs orfaos preservados. Fase futura de auditoria.
- **Multi-target** (um cron mandando resultado para N topics). Fase futura.
- **Cron chaining** (um cron dispara outro no fim). Nova capacidade -- fase propria.
- **Templates compartilhados de prompts de cron.** Nova capacidade -- fase propria.
- **Import/export de crons entre instalacoes.** Fase futura.

</deferred>

---

*Fase: 08-dashboard-web*
*Recorte da sessao: DASH-04 (UI de gerenciamento de cron jobs)*
*Contexto reunido: 2026-04-11*
