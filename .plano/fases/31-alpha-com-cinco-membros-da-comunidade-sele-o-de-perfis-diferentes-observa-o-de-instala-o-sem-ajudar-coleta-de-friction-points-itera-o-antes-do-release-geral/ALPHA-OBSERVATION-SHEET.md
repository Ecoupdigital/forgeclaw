# Alpha Observation Sheet — Template (1 por alpha)

Jonathan preenche UM arquivo deste formato por alpha em:
`.plano/fases/31-*/observations/<github-username>.md`

Este arquivo NUNCA e compartilhado com os alphas. E o jornal interno do PM (Jonathan) — anotacoes brutas, hipoteses, palpites. Serve de input pro relatorio final (PLAN 31-03) cruzar com o formulario de feedback.

**Frequencia de preenchimento:** diaria, 5-10 min no fim do dia.

---

## Copy do template

Copiar TUDO abaixo deste marcador para cada alpha individual, renomear para `<github-username>.md`:

```markdown
# Alpha Observation — {github-username}

**Alpha #:** {1..5}
**Nome:** {nome}
**Nivel tecnico declarado:** {iniciante/intermediario/avancado}
**Arquetipo escolhido no kickoff:** {slug}
**SO:** {linux/macos + versao}
**Data kickoff:** ____/____/____
**Data cut-off (D+7):** ____/____/____

---

## D0 — Kickoff + Install

**Hora do kickoff call:** ___:___
**Hora que aceitou invite GitHub:** ___:___
**Hora que clonou repo:** ___:___
**Hora que rodou `bun install` primeiro:** ___:___
**Hora que rodou `forgeclaw install` primeiro:** ___:___
**Hora que primeira mensagem no Telegram foi respondida:** ___:___
**T2FM observado pelo Jonathan:** ___ min

**Screencast recebido?** [ ] Sim [ ] Nao
**Onde salvar:** `.plano/fases/31-*/observations/<github-username>-screencasts/D0.mp4`

**Notas do D0:**
- (trava encontrada)
- (pergunta que fez no grupo)
- (pontos de confusao observados no screencast)
- (arquetipo alterado durante o install?)

**Classificacao preliminar:**
- [ ] Install foi smooth (sem trava)
- [ ] Install teve 1-2 travas menores (resolvidas em < 30min)
- [ ] Install teve trava media (> 30min ou reiniciou install)
- [ ] Install nao completou no D0 (carregou pra D1)

---

## D1

**Mensagens no Telegram hoje (aprox):** ___
**Abas do dashboard abertas hoje:**
- [ ] Sessoes
- [ ] Automacoes
- [ ] Memoria
- [ ] Configuracoes
- [ ] Personalidade
- [ ] Agentes
- [ ] Webhooks
- [ ] Tokens
- [ ] Atividade

**Pingou no grupo?** [ ] Sim sobre bug [ ] Sim sobre duvida [ ] Nao
**Bug reportado (se houver):**
- Gravidade: [ ] critico [ ] medio [ ] menor
- Descricao:
- Acao tomada pelo Jonathan: [ ] fix em 24h [ ] fix em 3 dias [ ] backlog friction point

**Notas do D1:** (observacao livre)

---

## D2

(mesma estrutura de D1)

---

## D3 (checkpoint mid-alpha)

**Status de engajamento:**
- [ ] Ativo (usou hoje)
- [ ] Silencioso (sem atividade visivel)
- [ ] Sinalizou desistencia ou frustracao

**Acao recomendada:**
- [ ] Deixar quieto
- [ ] Mandar DM gentil ("oi, ta tudo bem?")
- [ ] Pingar no grupo em geral ("quem ta vivo?")

**Notas do D3:** 

---

## D4

(mesma estrutura de D1)

---

## D5

(mesma estrutura de D1)

---

## D6

(mesma estrutura de D1)

---

## D+7 — Cut-off

**Formulario preenchido?** [ ] Sim [ ] Nao [ ] Preencheu parcial
**Se nao, acao:** [ ] DM lembrando [ ] deu prazo extra [ ] descartou do resultado

**Resumo geral em 3 linhas (fim do alpha, olhar de cima):**
1. (o que esse alpha provou)
2. (o que esse alpha quase desistiu por culpa do produto)
3. (recomendacao de melhoria mais forte derivada deste alpha)

---

## Timeline consolidada de bugs encontrados

Copy aqui em linha todos os bugs que esse alpha reportou nos 7 dias:

- [ ] [critico] (dia X) (descricao) — status: {fixed em Y dias / backlog / friction-only}
- [ ] [medio] (dia X) (descricao) — status: {...}
- [ ] [menor] (dia X) (descricao) — status: {...}

---

## Timeline consolidada de friction points (nao-bug)

UX ruim, mensagem confusa, fluxo contra-intuitivo — nao quebra mas irrita.

- (dia X) (descricao) — categoria: {onboarding / install / dashboard / telegram / docs}
- (dia X) (descricao) — categoria: {...}

---

## Veredicto final (Jonathan)

**Recomendaria que esse alpha virasse user pagante no v1?** [ ] Sim [ ] Talvez [ ] Nao
**Esse alpha foi util pro processo?** [ ] Muito [ ] Medio [ ] Pouco
**Input mais valioso que esse alpha gerou (uma frase):**
```

## Quando criar os arquivos individuais

Jonathan executa apos a selecao final (PLAN 31-02):

```bash
mkdir -p /home/projects/ForgeClaw/.plano/fases/31-*/observations
for user in alpha1 alpha2 alpha3 alpha4 alpha5; do
  cp /home/projects/ForgeClaw/.plano/fases/31-*/ALPHA-OBSERVATION-SHEET.md \
     /home/projects/ForgeClaw/.plano/fases/31-*/observations/$user.md
done
```

Depois edita cada arquivo trocando `{github-username}` pelo handle real.

## Regra de preenchimento

- Anotar TODO DIA. Nao deixar acumular. Memoria humana descarta friction em < 48h.
- Anotar bruto. "Cara nao entendeu a pergunta 3 da entrevista" e melhor que "usuario confuso no onboarding".
- Nao filtrar. Se parece irrelevante, anota mesmo assim — o relatorio final filtra.
