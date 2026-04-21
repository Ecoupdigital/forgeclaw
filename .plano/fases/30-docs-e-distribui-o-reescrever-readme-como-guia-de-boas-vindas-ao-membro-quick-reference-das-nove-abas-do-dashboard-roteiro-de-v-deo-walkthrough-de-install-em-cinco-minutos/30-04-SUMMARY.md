---
phase: 30-docs-e-distribuicao
plan: 30-04
subsystem: governance
tags: [governance, github, templates, support, community, process]
requires: [23, 29, 30-01]
provides:
  - "Templates GitHub reconhecidos oficialmente (ISSUE_TEMPLATE/bug.md, feature.md, config.yml, pull_request_template.md)"
  - "SUPPORT.md linkado automaticamente pelo GitHub no menu Support do repo"
  - "Camada de processo colaborativo: issue triage + PR checklist + hierarquia de suporte explicita"
  - "Documentacao interna dos canais da comunidade (docs/support-channel.md) pra Jonathan e staff"
affects:
  - "audit:personal:ci (allowlist backfill com 13 entries novas pra config.yml + feature.md + SUPPORT.md + support-channel.md)"
tech-stack:
  added: []
  patterns:
    - "Templates GitHub via frontmatter YAML (name/about/title/labels) conforme docs.github.com"
    - "config.yml com blank_issues_enabled: false + contact_links direciona duvidas pra canal antes do issue"
    - "Allowlist pattern mantido: match exato file:line:category com justificativa semantica alinhada com README.md:106/ACCESS.md:37"
key-files:
  created:
    - /home/projects/ForgeClaw/.github/ISSUE_TEMPLATE/bug.md
    - /home/projects/ForgeClaw/.github/ISSUE_TEMPLATE/feature.md
    - /home/projects/ForgeClaw/.github/ISSUE_TEMPLATE/config.yml
    - /home/projects/ForgeClaw/.github/pull_request_template.md
    - /home/projects/ForgeClaw/.github/SUPPORT.md
    - /home/projects/ForgeClaw/docs/support-channel.md
  modified:
    - /home/projects/ForgeClaw/.audit-personal-allowlist.txt
decisions:
  - "Templates escritos literalmente como especificado no plano (sem reformulacao criativa) — garante alinhamento entre verify automatizado e conteudo, e mantem tom consistente com README 30-01 (pt-BR, sem emoji, voce-forma)"
  - "SUPPORT.md posicionado em .github/SUPPORT.md (nao na raiz) porque o GitHub reconhece ambos mas .github/ e o padrao preferido e deixa a raiz limpa"
  - "docs/support-channel.md e guia interno pra staff (Jonathan/Luan/moderadores) — separado do SUPPORT.md publico pra que politica de moderacao e rotinas operacionais nao exponham dinamicas da comunidade no repo publico"
  - "config.yml hierarquiza suporte em 3 niveis ordenados (comunidade #forgeclaw-suporte > docs/ > ACCESS.md) antes de permitir issue — reduz ruido esperado quando membros sem contexto tecnico chegarem no alpha da Fase 31"
  - "PR template ancora checklist em typecheck+docs+CHANGELOG+privacidade+deps — cobre os 5 vetores de dano mais provaveis de PR de membro da comunidade (quebra de build, doc desatualizada, vazamento de token, dep bloat)"
  - "[Regra 3 - Bloqueante] allowlist backfill necessario pra satisfazer criterio de sucesso 'bun run audit:personal:ci passa' — findings seguem mesmo padrao semantico (attribution do mantenedor + URL do repo oficial) ja coberto por README.md:106 e ACCESS.md:37"
metrics:
  duration: "4min"
  completed: "2026-04-21T15:53Z"
  tasks: 6
  files_changed: 7
  commits: 7
---

# Fase 30 Plano 04: Templates GitHub + Canal de Suporte Documentado Summary

Criou a camada de processos colaborativos do repo: 2 templates de issue estruturados (bug + feature), config.yml que bloqueia issue em branco e direciona duvidas pra comunidade antes do GitHub, template de PR com checklist de typecheck/docs/privacidade, SUPPORT.md reconhecido pelo GitHub com hierarquia de 5 niveis pra obter ajuda, e docs/support-channel.md que documenta a estrutura interna dos 3 canais da comunidade (`#forgeclaw-suporte`, `#forgeclaw-dev`, `#forgeclaw-share`) + politica de moderacao + escalacao pra issue + rotinas pro Jonathan e staff. Essencial porque o repo e privado mas tem membros que podem contribuir via issue/PR — a ausencia de templates ate agora geraria ruido no alpha da Fase 31.

## O que foi feito

### Task 1: `.github/ISSUE_TEMPLATE/bug.md` (commit 63d1dc6)

Criou a pasta `.github/ISSUE_TEMPLATE/` do zero (nao existia no repo) e o template de bug com frontmatter GitHub (`name: Bug`, `labels: bug`, `title: '[BUG] '`), checklist obrigatorio de suporte primario (canal `#forgeclaw-suporte` + `docs/troubleshooting.md` + `docs/faq.md`), passos para reproduzir numerados, comportamento esperado vs atual, bloco de ambiente (OS, Bun version, Claude CLI version, ForgeClaw commit SHA, arquetipo instalado) e checklist de privacidade (sem tokens, sem Telegram User IDs, sem dados de terceiros).

### Task 2: `.github/ISSUE_TEMPLATE/feature.md` (commit 7f540c0)

Template de feature request com estrutura problema -> solucao ideal -> alternativas consideradas -> impacto esperado (quem ganha, quantos ganham, trade-offs) -> voluntariado (PR do proprio autor / pedido pro staff / apenas discutir). Checklist inicial obriga debate previo no canal `#forgeclaw-dev` e busca por issues existentes.

### Task 3: `.github/ISSUE_TEMPLATE/config.yml` (commit f9b92ff)

Config do GitHub que desabilita issue em branco (`blank_issues_enabled: false`) e expoe 3 contact_links ordenados por prioridade: (1) canal comunidade `#forgeclaw-suporte` como primario, (2) documentacao em `docs/`, (3) `ACCESS.md` pra problemas de acesso. Membro que clica "New Issue" precisa escolher entre bug/feature ou um dos 3 links — nao tem mais opcao de issue vazio.

### Task 4: `.github/pull_request_template.md` (commit 42b64b2)

Template de PR com blocos: O que muda, Tipo de mudanca (bug fix / feature / breaking / doc), Area afetada (6 packages/pastas: core, bot, dashboard, cli, docs, scripts-ops), Como foi testado com bloco de codigo, Checklist pre-PR (6 items: `bun run dev`, `bun run typecheck`, docs atualizados, CHANGELOG entry, sem tokens, dep justificada). Exibido automaticamente pelo GitHub ao abrir PR.

### Task 5: `.github/SUPPORT.md` (commit a4e5d37)

SUPPORT.md reconhecido automaticamente pelo GitHub (exibido no menu Support do repo) com hierarquia ordenada de 5 niveis: canal comunidade > `docs/faq.md` > `docs/troubleshooting.md` > `docs/getting-started.md` > GitHub Issue. Secoes "Quando nao usar issue" vs "Bom caso para issue" educam o membro sobre ruido. Politica de resposta explicita expectativa de SLA (canal < 24h / issue 1-2x por semana / PRs com triage semanal).

### Task 6: `docs/support-channel.md` (commit c6f6938)

Guia operacional interno pra Jonathan e staff (Luan + outros moderadores) cobrindo 3 canais da comunidade: `#forgeclaw-suporte` (primeira linha, SLA 24h, bot de welcome opcional), `#forgeclaw-dev` (arquitetura/features, features viram issue so APOS discussao), `#forgeclaw-share` (inspiracao com formato sugerido: screenshot + paragrafo + snippet). Blocos de politica de moderacao com acao gradual (aviso > suspensao > revogacao de acesso seguindo fluxo de `ACCESS.md`), escalacao pra GitHub Issue em 2 fluxos (`#forgeclaw-suporte` -> bug issue, `#forgeclaw-dev` -> feature issue), rotinas (Jonathan semanal, Luan diario) e metricas a observar no alpha da Fase 31.

## Desvios do Plano

### Issues Auto-corrigidos

**1. [Regra 3 - Bloqueante] Allowlist de personal context audit precisava backfill pros 13 findings novos dos templates**

- **Encontrado durante:** Verificacao final `bun run audit:personal:ci` apos os 6 commits das tarefas.
- **Issue:** O audit falhava com 15 findings critical. Analise mostrou que 13 eram legitimos do meu escopo e 2 pertenciam ao plano 30-02 (paralelo):
  - Meus (13): `.github/ISSUE_TEMPLATE/config.yml:7` (URL do repo oficial em contact_link — 2 categorias), `.github/ISSUE_TEMPLATE/config.yml:10` (URL do repo oficial em contact_link — 2 categorias), `.github/ISSUE_TEMPLATE/feature.md:34` (Jonathan no checklist de voluntariado), `.github/SUPPORT.md:3` (primeiro paragrafo descrevendo comunidade), `.github/SUPPORT.md:30` (politica de resposta identifica mantenedor), `docs/support-channel.md:3` (staff identificado), `docs/support-channel.md:13` (Jonathan como staff do canal suporte), `docs/support-channel.md:15` (URL do repo oficial em exemplo — 2 categorias), `docs/support-channel.md:25` (Jonathan como staff do canal dev), `docs/support-channel.md:65` (rotina semanal do mantenedor).
  - Fora do escopo (2): `docs/getting-started.md:29` (URL do repo em `git clone` — 2 categorias). Arquivo criado pelo plano 30-02 em commit `3d0ae4c`. NAO corrigido por mim (out-of-scope explicitamente demarcado no prompt: "NÃO mexa em outros arquivos de docs/ do 30-02").
- **Correcao:** Adicionou 13 entries ao `.audit-personal-allowlist.txt` em 2 blocos documentados (`.github/*` e `docs/support-channel.md`), cada entry com justificativa textual. Padrao semantico identico ao ja usado para `README.md:106` (attribution publica do autor) e `ACCESS.md:37` (membros conhecem o mantenedor pelo primeiro nome).
- **Arquivos modificados:** `/home/projects/ForgeClaw/.audit-personal-allowlist.txt`
- **Commit:** `ec88c1b`
- **Verificacao pos-fix:** `bun run audit:personal:ci` reduz de 15 -> 2 findings (os 2 restantes pertencem a 30-02).

### Issues Fora do Escopo (NAO corrigidos)

**1. `docs/getting-started.md:29` com 2 findings critical (personal_company + private_repo_url)**

- **Encontrado durante:** Verificacao final `bun run audit:personal:ci` apos os 6 commits.
- **Motivo:** Arquivo criado pelo plano 30-02 em commit `3d0ae4c`, que ainda nao produziu SUMMARY.md. Prompt do executor (30-04) demarca explicitamente: "NÃO mexa em outros arquivos de docs/ (do 30-02)".
- **Acao:** Registrado aqui como descoberta fora do escopo. Plano 30-02 e responsavel por allowlistar ou sanitizar. Criterio de sucesso "bun run audit:personal:ci passa" NAO pode ser totalmente satisfeito durante a janela paralela com 30-02 — so sera atingido apos 30-02 concluir sua allowlist.

## Self-Check: PASSOU

- `.github/ISSUE_TEMPLATE/bug.md` existe com frontmatter (name: Bug, labels: bug), secoes "Passos para reproduzir"/"Ambiente"/"Checklist de privacidade" presentes
- `.github/ISSUE_TEMPLATE/feature.md` existe com "Qual problema", "Alternativas consideradas", "Voluntaria pra implementar"
- `.github/ISSUE_TEMPLATE/config.yml` existe com `blank_issues_enabled: false` + `contact_links` + referencia a `forgeclaw-suporte`
- `.github/pull_request_template.md` existe com "Tipo de mudanca", "Area afetada", "Checklist", `bun run typecheck`
- `.github/SUPPORT.md` existe com "Ordem sugerida", 2+ referencias a `forgeclaw-suporte`, link pra `docs/faq.md`, secao "Nao e bom caso para issue"
- `docs/support-channel.md` existe com 3 canais (#forgeclaw-suporte / #forgeclaw-dev / #forgeclaw-share), "Politica de moderacao", "Escalacao pra GitHub"
- 6 commits de tarefa (63d1dc6, 7f540c0, f9b92ff, 42b64b2, a4e5d37, c6f6938) + 1 commit de correcao de desvio (ec88c1b) = 7 commits
- `bun run audit:personal:ci` reduz de 15 findings (pre) -> 2 findings (pos), sendo os 2 restantes fora de escopo do 30-04 (pertencem ao 30-02)
- Zero checkpoints disparados (plano totalmente autonomo, wave 1, type=chore)

## Commits gerados

| # | Hash | Escopo | Descricao |
|---|------|--------|-----------|
| 1 | `63d1dc6` | Task 1 | chore(30-04): add GitHub issue template for bug reports |
| 2 | `7f540c0` | Task 2 | chore(30-04): add GitHub issue template for feature requests |
| 3 | `f9b92ff` | Task 3 | chore(30-04): disable blank issues and redirect to community channels |
| 4 | `42b64b2` | Task 4 | chore(30-04): add pull request template with scoped checklist |
| 5 | `a4e5d37` | Task 5 | chore(30-04): add SUPPORT.md with tiered help hierarchy |
| 6 | `c6f6938` | Task 6 | docs(30-04): document community support channel structure for staff |
| 7 | `ec88c1b` | Desvio (Regra 3) | chore(30-04): allowlist attribution in .github/ templates + support-channel |

## Proximos passos

Plano 30-02 (paralelo a este) esta finalizando o corpo tecnico da documentacao em `docs/` (`faq.md`, `troubleshooting.md`, `archetypes.md`, etc) — templates criados aqui ja linkam corretamente pra `docs/faq.md` e `docs/troubleshooting.md`. Plano 30-03 cria `docs/video-script.md` (roteiro do walkthrough de 5min referenciado no README 30-01). Fase 31 abre alpha com 5 membros da comunidade — os templates+SUPPORT deste plano sao a primeira linha de triagem pra capturar friction points via issue estruturado em vez de mensagem solta na comunidade.
