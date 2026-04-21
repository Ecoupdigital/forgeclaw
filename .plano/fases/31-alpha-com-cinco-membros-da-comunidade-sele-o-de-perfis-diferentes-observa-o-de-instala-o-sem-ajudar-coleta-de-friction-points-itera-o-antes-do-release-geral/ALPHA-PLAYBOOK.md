# Alpha Playbook — Fase 31

Passo a passo operacional que Jonathan segue para executar o alpha controlado do ForgeClaw com 5 membros da comunidade Dominando AutoIA.

**Duracao total:** 14 dias corridos (T-7 ate D+7).
**Esforco do Jonathan:** ~8-12h totais distribuidos ao longo dos 14 dias.
**Dependencias:** Fase 30 completa (docs existem). Plano 29-02 completo (script `access.ts` funciona).

## Referencias

- Criterios de selecao → `ALPHA-CANDIDATES.md`
- Mensagens prontas → `ALPHA-INVITE-MESSAGE.md`
- Roteiro da call → `ALPHA-ONBOARDING-CALL-SCRIPT.md`
- Formulario de feedback → `ALPHA-FEEDBACK-TEMPLATE.md`
- Planilha de observacao por alpha → `ALPHA-OBSERVATION-SHEET.md`
- Script de acesso → `ops/gate/access.ts` (Fase 29)
- Docs que os alphas leem → Fase 30

---

## Fase 0 — Pre-requisitos (T-7, 1 hora)

Antes de convidar qualquer pessoa, validar que o produto esta pronto para receber humanos.

**Checklist de prontidao:**

- [ ] Fase 30 completa — README atualizado, video walkthrough de 5 min publicado em YouTube unlisted, quick reference das 9 abas existe em `/docs/`.
- [ ] `git clone https://github.com/Ecoupdigital/forgeclaw.git && cd forgeclaw && bun install && bun run packages/cli/src/index.ts install` roda ponta-a-ponta numa VM Ubuntu 22.04 limpa. Jonathan precisa validar isso pessoalmente numa Hetzner temporaria.
- [ ] Mesmo teste em macOS (pode ser no Mac do proprio Jonathan com conta secundaria).
- [ ] `bun run ops/gate/access.ts --help` mostra os 4 subcomandos.
- [ ] `bun run ops/gate/access.ts list` lista collaborators (pode estar vazio).
- [ ] Formulario Tally criado a partir de `ALPHA-FEEDBACK-TEMPLATE.md` e publicado. Link colado em `ALPHA-INVITE-MESSAGE.md` bloco 3.
- [ ] Grupo privado do Telegram criado (nome sugerido: "ForgeClaw Alpha 01"). Link de invite colado em `ALPHA-INVITE-MESSAGE.md` bloco 2.
- [ ] Data do kickoff definida (sugestao: Segunda as 20h horario Brasil — pega quem esta voltando de fim de semana sem estar cansado).

**Se algum item falha:** NAO avancar. O alpha vira puro chaos se o produto nao esta pronto. Voltar para a fase responsavel.

---

## Fase 1 — Selecao dos 5 alphas (T-5 ate T-2, ~2h)

### Dia T-5: Identificar candidatos

1. Abrir plataforma da comunidade (ou Instagram da Dominando AutoIA). Listar membros ativos nos ultimos 30 dias.
2. Cruzar com criterios obrigatorios de `ALPHA-CANDIDATES.md`:
   - Assinatura em dia
   - Ja manifestou ter Claude Max publicamente (ou pingar em privado perguntando)
   - Linux ou macOS
3. Preencher a matriz em `ALPHA-CANDIDATES.md` com >= 10 candidatos.

### Dia T-4: Filtrar

1. Aplicar criterios de diversidade (nivel tecnico, arquetipo, SO, perfil pessoal).
2. Aplicar criterios de desempate (tempo na comunidade, participacao).
3. Ordenar por total desc.

### Dia T-3: Selecao final

1. Escolher os 5 topo com distribuicao forcada 2 avc / 2 int / 1 ini.
2. Preencher secao "Lista final dos 5 alphas" em `ALPHA-CANDIDATES.md`.
3. Confirmar que cobrem >= 3 arquetipos.

### Dia T-2: Convite (DM individual)

Para cada um dos 5, copiar mensagem 1 de `ALPHA-INVITE-MESSAGE.md` e mandar DM. Personalizar `{NOME}` e `{QUANDO_ENTROU}`.

**Regra:** esperar 24h para aceite. Se nao respondeu, ir pro proximo da matriz (6o colocado).

### Dia T-1: Confirmar aceites

Depois de ter 5 confirmados:

1. Criar grupo privado Telegram "ForgeClaw Alpha 01".
2. Adicionar os 5 (so depois de aceite confirmado).
3. Postar mensagem 3 (boas-vindas) no grupo — SEM personalizacao.
4. DM individual: mensagem 2 (confirmacao). Colar link da call + link do grupo.

---

## Fase 2 — Kickoff (D0, 1 hora)

### Hora Z-0:30: Pre-call

Seguir `ALPHA-ONBOARDING-CALL-SCRIPT.md` pre-call checklist.

### Hora Z: Call

Seguir os 7 blocos do roteiro. Duracao maxima 30 min + 15 min de Q&A livre.

### Apos a call:

1. Salvar gravacao em `.plano/fases/31-*/recordings/kickoff-YYYY-MM-DD.mp4`.
2. Criar pasta de observacao:
   ```bash
   mkdir -p /home/projects/ForgeClaw/.plano/fases/31-*/observations
   cd /home/projects/ForgeClaw/.plano/fases/31-*
   for user in alpha1 alpha2 alpha3 alpha4 alpha5; do
     cp ALPHA-OBSERVATION-SHEET.md observations/$user.md
   done
   ```
   Trocar `alpha1..5` pelos handles reais depois.
3. Preencher campo D0 de cada observation sheet com os horarios coletados.

---

## Fase 3 — Observacao ativa (D0 tarde ate D+7, ~30min/dia)

### Regra de ouro: NAO AJUDAR nas primeiras 24h

Se algum alpha pinga pedindo ajuda nas primeiras 24h, responder:

> "Anota o ponto onde travou e tenta mais uma vez. Se passar de 24h nessa mesma trava, a gente conversa."

Se algum alpha reporta bug critico (nao consegue sequer instalar / crash imediato), tratar diferente: agradecer o report, marcar como `[critico]` no observation sheet daquela pessoa, mas NAO fornecer workaround. A resposta e:

> "Registrado. Vou fixar isso. Enquanto nao sai patch, voce pode pausar — aviso aqui quando puder retomar."

### Rotina diaria (5-10 min)

Todo fim de dia, Jonathan:

1. Abre o grupo privado, le todas as mensagens.
2. Para cada alpha, abre `observations/<username>.md` e preenche o bloco do dia:
   - Mensagens aprox.
   - Abas abertas (se mencionado)
   - Pingou? Sobre o que?
   - Bug? Classifica gravidade + acao.
   - Notas livres.
3. Para bugs criticos, vai pro terminal, reproduz, pusha fix para `main`, abre issue em `github.com/Ecoupdigital/forgeclaw/issues`, comunica no grupo:
   > "Fix para {bug} foi pra main. Quem tava travado nisso pode `git pull && bun install && forgeclaw update` e retomar."
4. Para bugs medios, cria issue no GitHub com label `alpha-medium` — fix em 3 dias.
5. Para friction points (nao e bug — e UX ruim), adiciona no final de `ALPHA-OBSERVATION-SHEET.md` do alpha. NAO fixa agora. Acumula pra revisao pos-alpha.

### D+3: Mid-alpha checkpoint

1. Abrir os 5 observation sheets e ver quem esta silencioso.
2. Para quem esta silencioso, DM gentil:
   > "oi {nome}, ta tudo bem? nao te vi postar nos ultimos dois dias. instalou OK? ta usando?"
3. Registrar resposta no observation sheet dele.

### D+6: Recado de cut-off

Postar no grupo:

> "Galera, faltam 24h pro cut-off. Formulario do D+7 aqui: {link}. 15-20 min. Primeiros que entregarem eu analiso primeiro — feedback cedo = mais influencia."

### Cut-off D+7

Conferir quem preencheu. DM lembrando os que nao preencheram.

Se ate D+8 alguem nao respondeu:

- Tentar 1 vez mais por DM.
- Se continuar silencio, marcar em `observations/<username>.md` como "parcial" ou "sem dados" e seguir.

---

## Fase 4 — Ciclo de iteracao durante o alpha (continuo)

**Prioridades de fix:**

| Tipo | Exemplo | SLA | Acao |
|------|---------|-----|------|
| Critico | Install nao completa / crash imediato / nao consegue mandar primeira mensagem | 24h | Fix, push main, DM no grupo pra retomar |
| Medio | Feature trava mas tem workaround conhecido | 3 dias | Issue com label `alpha-medium`, fix em paralelo |
| Friction | "A pergunta da entrevista e confusa" / "o botao nao parece clicavel" | POS-alpha | Append em friction points, avaliar em PLAN 31-03 |
| Arquitetura | "Poderia ter suporte a multi-user" | NAO fazer | Guardar em backlog geral do produto |

**Regra:** ALpha nao e reescrita. Se alguem pede "troca o framework", agradece e arquiva. So se mexe em bug e em friction cirurgico.

---

## Fase 5 — Encerramento do alpha (D+7, ~1h)

1. Confirmar que os 5 observation sheets estao preenchidos.
2. Confirmar que as respostas do formulario foram exportadas (CSV) e salvas em `.plano/fases/31-*/feedback-responses.csv`.
3. Postar no grupo:

   > "Galera, alpha oficialmente encerrado. Obrigado a todos. Vou consolidar em relatorio nos proximos dias. Se eu precisar de followup, chamo individual. O grupo fica aberto por mais 7 dias pra quem quiser continuar testando e reportando bugs — depois disso fecho."

4. Seguir para PLAN 31-02 (consolidacao e decisao).

---

## Ferramentas mentais para o Jonathan

1. **Voce e PM, nao suporte.** Se travar em ajudar, lembra que seu papel aqui e observar — nao salvar.
2. **Anota bruto.** Se rabiscar "cara nao gostou do roxo" hoje, pode ser que vire feature de temas semana que vem.
3. **Nao leve pro pessoal.** NPS 6 nao e critica a voce — e dado pra corrigir o produto.
4. **O silencio tambem e dado.** Quem nao usa o produto e quem mais te ensina se o produto e necessario.
