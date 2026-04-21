# Release Decision — ForgeClaw v1

**Documento criado em:** (data do PLAN 31-03, ANTES de analisar dados)
**Preenchido em:** (data pos-alpha, apos rodar analyze-feedback.ts)

## Criterios Go/No-Go — travados

O release geral acontece **se e somente se TODOS os criterios abaixo forem atingidos**. Regra de AND absoluto — falhar um criterio = No-Go.

### Criterios de aprovacao (AND)

1. **NPS >= 30** (apenas Promoters tem mais peso que Detractors em 30 pontos percentuais)
2. **T2FM mediano <= 30 min** (meio dos 5 alphas conseguiu chat no Telegram em 30 min ou menos)
3. **>= 4 de 5 alphas completaram o onboarding entrevistador ate o fim** (Q9 = "Sim, ate o fim")
4. **Taxa de auto-sucesso >= 80%** (>= 4 dos 5 instalaram sem precisar de ajuda direta do Jonathan nas primeiras 24h)
5. **Zero bugs criticos abertos** (todo bug [critico] do BUG-TRIAGE.md com status=fixed OU reclassificado para medio apos investigacao)
6. **Cobertura de abas media >= 5 de 9** (alphas exploraram ao menos maioria do dashboard)

### Criterios informativos (nao sao gate, mas aparecem no relatorio)

- Estabilidade percebida media (Q22)
- Distribuicao de arquetipos escolhidos
- Cluster de features pedidas

### Por que esses bars?

- **NPS 30:** e o bar baixo aceitavel pra SaaS B2C em alpha. Acima de 30 sugere base de promoters que empurra organicamente.
- **T2FM 30 min:** se demora mais que isso pra primeira mensagem, o ciclo de abandono (tempo ate desistir) na base geral vai ser catastrofico.
- **4/5 entrevista completada:** se 2 ou mais pularam, o onboarding e ruim demais — esse e o gatekeeper principal.
- **4/5 auto-sucesso:** valida que a documentacao e suficiente. Se Jonathan teve que ajudar mais que 1, o release geral sem ele de baba sera problema.
- **Zero bug critico:** impossivel justificar abrir pra comunidade com produto que nao instala.
- **Cobertura abas 5/9:** mostra que o dashboard e descoberto no uso real, nao so o chat funciona.

## Decisao final (preencher apos alpha)

**Resultado dos criterios:**

| # | Criterio | Target | Real | Passou? |
|---|----------|--------|------|---------|
| 1 | NPS | >= 30 | ___ | [ ] |
| 2 | T2FM mediano (min) | <= 30 | ___ | [ ] |
| 3 | Entrevista completada | >= 4/5 | ___/5 | [ ] |
| 4 | Auto-sucesso | >= 4/5 | ___/5 | [ ] |
| 5 | Bugs criticos open | = 0 | ___ | [ ] |
| 6 | Cobertura abas media | >= 5 | ___ | [ ] |

**Decisao:** [ ] GO | [ ] NO-GO

**Data da decisao:** ____/____/____
**Assinatura (Jonathan escreve nome aqui):** _______________

## Se GO — plano de release geral

1. **Data do release:** ____/____/____
2. **Pre-release work (P0 do IMPROVEMENTS-BACKLOG.md):**
   - [ ] Melhoria 1
   - [ ] Melhoria 2
   - [ ] (max 3 melhorias P0 antes do release. Mais que isso, virar No-Go.)
3. **Execucao do release:**
   - [ ] Rodar script de grant em massa (ver tarefa 5 deste plano)
   - [ ] Post no canal geral da comunidade anunciando
   - [ ] Atualizar ACCESS.md com instrucoes pra membros
   - [ ] Monitor primeiras 48h — qualquer bug critico reportado por membros novos vira priority 0

## Se NO-GO — plano de alpha 02

1. **Target do alpha 02:** atingir os criterios acima
2. **Data estimada alpha 02:** ____/____/____
3. **Novos 5 alphas:** mesmos 5? outros? — decidir:
   - Mesmos 5: baixo esforco, mas viesa pois ja conhecem o produto
   - 5 novos: maior esforco de selecao, dado mais limpo
   - Recomendacao default: 2 novos + 3 dos antigos (mistura)
4. **Melhorias obrigatorias antes do alpha 02:** ver IMPROVEMENTS-BACKLOG.md secao P0 e P1
5. **Comunicacao aos alphas atuais:** "O alpha foi util demais, mas ficou claro que precisamos resolver X e Y antes de abrir. Obrigado, mantenham o acesso, e quando a gente rodar o alpha 02, vou chamar novamente alguns de voces."

---

## Evidencias anexas

- `POST-ALPHA-REPORT.md` — relatorio completo
- `feedback-responses.csv` — respostas brutas
- `analyze-feedback.ts` output — metricas calculadas
- `BUG-TRIAGE.md` — status dos bugs
- `DAILY-STANDUP.md` — historico dia a dia
