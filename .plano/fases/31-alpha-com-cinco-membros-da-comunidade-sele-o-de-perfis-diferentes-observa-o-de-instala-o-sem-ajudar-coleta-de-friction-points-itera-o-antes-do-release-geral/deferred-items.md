# Deferred Items — Fase 31 Plano 03

Items adiados do PLAN 31-03 que dependem de **dados reais do alpha** que ainda nao foi executado. Infraestrutura (templates + script) esta 100% pronta — o que resta e consumo de dados quando o alpha real rodar.

---

## DEFERRED-01: Preencher POST-ALPHA-REPORT.md com dados reais

**Task original:** 31-03 Task 5 (checkpoint:human-action)

**Estado atual:** POST-ALPHA-REPORT-TEMPLATE.md existe (commit 3400a44) com 12 secoes estruturadas e slots para todos os dados.

**O que falta:**
1. Copiar TEMPLATE.md -> POST-ALPHA-REPORT.md
2. Preencher secao 1 (sumario executivo), secao 2 (participantes), secao 3 (metricas — rodar analyze-feedback.ts no CSV real), secao 4 (top 5 bugs do BUG-TRIAGE.md real), secao 5 (top 10 friction), secao 6-7 (amou/odiou — clusters de Q23/Q24), secao 8 (observacoes qualitativas), secao 9 (features pedidas — cluster de Q27), secao 10 (Go/No-Go apos RELEASE-DECISION.md), secao 11 (proximos passos), secao 12 (retrospectiva).

**Quando executar:** D+8 do alpha real (apos os 5 alphas preencherem o formulario D+7).

**Dependencia:** `feedback-responses.csv` existe no diretorio da fase.

**Esforco estimado:** ~2-3h (preenchimento das 12 secoes + clustering qualitativo).

---

## DEFERRED-02: Preencher RELEASE-DECISION.md com resultado real

**Task original:** 31-03 Task 5 (checkpoint:human-action)

**Estado atual:** RELEASE-DECISION.md existe (commit c53e953) com 6 criterios Go/No-Go travados + rationale + template de resultado. Criterios foram definidos **antes** dos dados — anti-vies de confirmacao.

**O que falta:**
1. Rodar `bun run .plano/fases/31-.../analyze-feedback.ts .plano/fases/31-.../feedback-responses.csv`
2. Copiar output dos 6 gates (NPS, T2FM, entrevista, auto-sucesso, bugs, cobertura) na tabela de resultados
3. Marcar [x] em cada criterio que passou
4. Se TODOS os 6 passaram -> marcar GO. Se pelo menos 1 falhou -> marcar NO-GO.
5. Escrever justificativa (<=200 palavras).
6. Preencher "Data da decisao" + "Assinatura".

**Quando executar:** D+8 do alpha real, apos o POST-ALPHA-REPORT.md.

**Dependencia:** `feedback-responses.csv` + BUG-TRIAGE.md preenchido com status final dos bugs.

**Esforco estimado:** ~30 min.

---

## DEFERRED-03: Preencher IMPROVEMENTS-BACKLOG.md com P0/P1/P2 reais

**Task original:** 31-03 Task 5 (checkpoint:human-action)

**Estado atual:** IMPROVEMENTS-BACKLOG.md existe (commit dc4e98f) com template P0/P1/P2 + criterios de priorizacao + regra "max 3 P0" + guia de extracao automatica.

**O que falta:**
1. Seguir secao "Extracao automatica" do template:
   - Agrupar FRICTION-LOG.md por tema + contar ocorrencias -> distribuir em P0/P1/P2
   - Classificar BUG-TRIAGE.md linhas open/deferred
   - Cluster Q27 do CSV por similaridade
   - Cross-check Q24 (>=2 mencoes iguais = P0 automatico)
2. Preencher tabelas P0/P1/P2 com entradas reais.
3. Verificar <=3 P0 (se mais, reavaliar criterios).
4. Somar esforco estimado por bloco.

**Quando executar:** D+8 do alpha real, em paralelo com POST-ALPHA-REPORT.md.

**Dependencia:** FRICTION-LOG.md + BUG-TRIAGE.md preenchidos (output do PLAN 31-02) + feedback-responses.csv.

**Esforco estimado:** ~1h (extracao sistematica + clustering).

---

## DEFERRED-04: Comunicacao final aos 5 alphas

**Task original:** 31-03 Task 5 passo 6 (checkpoint:human-action)

**Estado atual:** Nao executado — depende dos 3 artefatos acima.

**O que falta:**
- Postar mensagem no grupo privado com resultado GO/NO-GO + metricas publicas + obrigado.
- Rascunho base ja existe no plano 31-03 Task 5.

**Quando executar:** D+8 apos as 3 decisoes acima.

**Esforco estimado:** ~15 min (customizar rascunho + postar).

---

## DEFERRED-05: Execucao do release (GO) OU planejamento do alpha 02 (NO-GO)

**Task original:** 31-03 Task 6 (checkpoint:human-action)

**Estado atual:** Nao executado — depende da decisao real.

**Se GO:**
1. Implementar max 3 P0 do IMPROVEMENTS-BACKLOG.md (~1-5 dias).
2. Preparar `ops/gate/mass-grant-list.txt` com membros ativos da Dominando AutoIA (exportar do Asaas).
3. Rodar script de grant em massa em loop com `ops/gate/access.ts grant` (sleep 2s entre cada pra rate limit).
4. Postar anuncio no canal geral (Instagram + Telegram da Dominando AutoIA).
5. Monitor primeiras 48h pos-release — bugs criticos reportados viram prioridade 0.

**Se NO-GO:**
1. Identificar gates que falharam.
2. Traduzir para P0 concretos.
3. Criar plano em `.plano/fases/32-alpha-02-ajustes/` (precisa ser adicionado ao ROADMAP.md).
4. Comunicar aos 5 alphas + decidir se mantem os mesmos ou mistura novos.
5. Postar transparentemente: "Adiar release geral. Alpha 02 em {data} apos corrigir {P0}."

**Quando executar:** D+10 em diante.

**Esforco estimado (GO):** ~1-5 dias (P0) + 1 dia (grant + anuncio + monitor).
**Esforco estimado (NO-GO):** ~1-3 dias (planejamento alpha 02 + comunicacao).

---

## Resumo

**Artefatos entregues no PLAN 31-03 (prontos):**
- `POST-ALPHA-REPORT-TEMPLATE.md` — commit 3400a44
- `RELEASE-DECISION.md` — commit c53e953 (criterios travados pre-dados)
- `analyze-feedback.ts` — commit 108ac9e (script funcional validado em CSV de teste)
- `IMPROVEMENTS-BACKLOG.md` — commit dc4e98f

**Artefatos a produzir pos-alpha real (deferred):**
- `feedback-responses.csv` (coletado no formulario Tally/Google Forms D+7)
- `POST-ALPHA-REPORT.md` (preenchido a partir do TEMPLATE)
- `RELEASE-DECISION.md` — secao "Decisao final" preenchida
- `IMPROVEMENTS-BACKLOG.md` — tabelas P0/P1/P2 preenchidas
- `ops/gate/mass-grant-list.txt` (somente se GO)
- `.plano/fases/32-.../` (somente se NO-GO)

**Rationale do DEFER:** Executar Tasks 5-6 sem dados reais do alpha produziria artefatos fabricados — violaria "Dados reais desde o primeiro momento" (principio 5 da UP) e "implementacao real, nao simulacao" (principio 1). Templates + script garantem que a execucao pos-alpha seja mecanica (~4h total).
