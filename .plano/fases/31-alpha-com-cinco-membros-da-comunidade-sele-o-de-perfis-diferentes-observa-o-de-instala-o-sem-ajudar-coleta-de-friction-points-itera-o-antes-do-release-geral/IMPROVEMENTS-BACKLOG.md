# Improvements Backlog — Pos-Alpha Fase 31

Lista priorizada de melhorias derivadas do alpha. Input: FRICTION-LOG.md + BUG-TRIAGE.md (bugs medios/menores nao fixados) + Q27 do formulario (features pedidas) + Q24 (mais odiou).

## Niveis de prioridade

- **P0:** Blocker do release geral. Se GO, fixar antes de abrir. Se NO-GO, fixar antes de alpha 02.
- **P1:** Importante mas nao blocker. Implementar nas primeiras 2-4 semanas pos-release.
- **P2:** Nice to have. Backlog geral do produto. Avaliar junto com outros features.

## Criterios de priorizacao P0

Uma melhoria e P0 se pelo menos UM destes e verdade:

- Citada por >= 3 alphas como friction (FRICTION-LOG ocorrencia >=3)
- Citada na Q24 ("mais odiou") por >= 2 alphas
- Causou T2FM > 60 min em algum alpha (blocker de primeira experiencia)
- Bug medio que se repetiu em >= 2 alphas (mesmo com workaround, corroi confianca)

## Criterios P1

- Citada por 1-2 alphas como friction
- Citada na Q27 (feature pedida) por >= 2 alphas
- Bug menor que afeta fluxo principal
- Melhoria que aumentaria NPS segundo observacao qualitativa do Jonathan

## Criterios P2

- Citada por 1 alpha sem replicacao
- Ideia interessante mas nao esta resolvendo dor real
- Melhoria arquitetural que nao afeta experiencia atual

## Backlog (preencher pos-alpha)

### P0 — Blockers

| # | Titulo | Fonte (alpha/friction/bug/feature) | Descricao | Proposta de fix | Esforco estimado (h Claude) | Issue URL |
|---|--------|------------------------------------|-----------|------------------|------------------------------|-----------|
| 1 |        |                                    |           |                  |                              |           |

Regra: **maximo 3 P0**. Se mais que 3 aparecem como P0 genuino, o produto nao esta pronto — vira automatic No-Go.

### P1 — 2-4 semanas pos-release

| # | Titulo | Fonte | Descricao | Proposta de fix | Esforco | Issue URL |
|---|--------|-------|-----------|------------------|---------|-----------|
| 1 |        |       |           |                  |         |           |

### P2 — Backlog geral

| # | Titulo | Fonte | Descricao | Proposta | Esforco |
|---|--------|-------|-----------|----------|---------|
| 1 |        |       |           |          |         |

## Extracao automatica (passos)

1. **Do FRICTION-LOG.md:**
   - Agrupar linhas por similaridade (mesmo tema = mesma linha aqui).
   - Contar ocorrencias por tema.
   - Qualquer tema com 3+ ocorrencias vai pra P0. Com 2 vai pra P1. Com 1 vai pra P2.

2. **Do BUG-TRIAGE.md:**
   - Bugs com status=fixed ficam de fora (ja estao resolvidos).
   - Bugs status=open ou deferred: medios -> P1 se afetaram >=2 alphas, senao P2. Menores -> P2.

3. **Da Q27 do formulario (feature mais pedida):**
   - Cluster por similaridade.
   - Cluster com 3+ mencoes -> P0 (se conecta a fluxo critico do produto) ou P1 (se e extensao).
   - Cluster com 2 -> P1 se compact, senao P2.
   - Cluster com 1 -> P2.

4. **Da Q24 (mais odiou):**
   - Se uma mesma dor aparecer aqui em >= 2 alphas, sempre vira P0 (reclamacao direta e forte sinal).

## Tempo total estimado por bloco

Apos preencher, somar coluna "Esforco estimado" e reportar:

- Total P0: ___ horas Claude
- Total P1: ___ horas Claude
- Total P2: ___ horas Claude
- Soma: ___ horas

## Notas pos-alpha (Jonathan)

Espaço livre para reflexoes sobre padroes que nao se encaixam em P0/P1/P2:

- (tema recorrente que nao e uma feature especifica)
- (sensacao do Jonathan que nao tem evidencia numerica mas importa)
