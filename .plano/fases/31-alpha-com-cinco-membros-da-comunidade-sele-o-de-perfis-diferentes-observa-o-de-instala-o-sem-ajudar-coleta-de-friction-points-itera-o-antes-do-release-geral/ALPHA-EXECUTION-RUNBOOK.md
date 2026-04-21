# Alpha Execution Runbook — Fase 31-02

Este runbook reune TUDO que Jonathan executa em campo durante o alpha: tarefas humanas do PLAN 31-02 (1, 2, 5, 6, 7) que NAO podem ser executadas pelo Claude Code.

O PLAN 31-02 teve dois tipos de tarefa:

- **Auto (criadas pelo agente):** DAILY-STANDUP.md, BUG-TRIAGE.md, FRICTION-LOG.md. Ja prontas no diretorio.
- **Human-action (DEFERRED — precisam de Jonathan):** convidar alphas, criar grupo, kickoff call, 7 dias de observacao, coletar CSV. Este runbook.

**Artefatos de suporte ja existentes (produzidos em 31-01):**

- `ALPHA-CANDIDATES.md` — matriz de selecao (preencher)
- `ALPHA-INVITE-MESSAGE.md` — 3 mensagens copy-paste
- `ALPHA-ONBOARDING-CALL-SCRIPT.md` — roteiro 30 min
- `ALPHA-OBSERVATION-SHEET.md` — template por alpha
- `ALPHA-FEEDBACK-TEMPLATE.md` — 28 perguntas do formulario
- `ALPHA-PLAYBOOK.md` — overview operacional T-7 ate D+7

**Artefatos de suporte produzidos agora (31-02):**

- `DAILY-STANDUP.md` — log agregado dia-a-dia
- `BUG-TRIAGE.md` — lista de bugs com SLA
- `FRICTION-LOG.md` — lista de friction points

---

## Como usar este runbook

Executar **em ordem cronologica**. Cada secao corresponde a uma `<task>` humana do PLAN 31-02.

Ao terminar cada secao, marcar `[x]` e anotar data/hora. Se pausar, registrar em DAILY-STANDUP.md antes de largar.

**Duracao total estimada:** 14 dias corridos + ~8-12h de esforco real do Jonathan.

---

## SECAO 1: Convidar os 5 alphas (T-2 a T-1)

Corresponde a PLAN 31-02 Task 1.

### Pre-requisito

`ALPHA-CANDIDATES.md` tem secao "Lista final dos 5 alphas" preenchida (isto ja deveria estar feito na Fase 1 do PLAYBOOK, via Fase 1 T-3).

### Passos

- [ ] 1.1. Abrir `ALPHA-INVITE-MESSAGE.md` bloco 1.
- [ ] 1.2. Para cada um dos 5, personalizar `{NOME}` e `{QUANDO_ENTROU}` e enviar DM via plataforma da comunidade (ou Telegram/Instagram direct, onde o alpha esta mais ativo).
- [ ] 1.3. Aguardar aceite (max 24h por pessoa).
- [ ] 1.4. Para quem aceitou, coletar via DM: GitHub username confirmado, sistema operacional exato, nivel tecnico auto-declarado, arquetipo pretendido.
- [ ] 1.5. Atualizar `ALPHA-CANDIDATES.md` com dados finais.
- [ ] 1.6. Se alguem nao aceitou ate 24h, ir pro 6o da matriz. Nao forcar.

### Saida esperada

5 aceites confirmados + campos preenchidos em `ALPHA-CANDIDATES.md`.

### Verify automatico

```bash
grep -E "^\| [0-9]+ \|" /home/projects/ForgeClaw/.plano/fases/31-*/ALPHA-CANDIDATES.md \
  | awk -F'|' '{gsub(/ /,"",$12); if ($12 ~ /[xX]/) count++} END {if (count >= 5) exit 0; else { print "Apenas " count " selecionados"; exit 1 }}'
```

### Regra de pausa

Se ate T-1 nao houver 5 aceites, **pausar a fase** e reabrir selecao com lista maior. Nao rodar alpha com 3 ou 4 pessoas — amostra pequena demais pra tirar conclusao.

---

## SECAO 2: Criar grupo Telegram + boas-vindas (T-1)

Corresponde a PLAN 31-02 Task 2.

### Passos

- [ ] 2.1. Criar grupo privado no Telegram:
  - Nome: `ForgeClaw Alpha 01`
  - Tipo: privado, com link de invite por admin only
  - Icone: logo ForgeClaw (se existir em `assets/`) ou garra preta em fundo roxo
- [ ] 2.2. Copiar link do invite.
- [ ] 2.3. Abrir `ALPHA-INVITE-MESSAGE.md` bloco 2 (confirmacao DM). Para cada alpha, personalizar `{NOME}`, `{DATA_KICKOFF}`, `{LINK_CALL}`, `{LINK_GRUPO}` e enviar DM individual.
- [ ] 2.4. Aguardar os 5 entrarem no grupo.
- [ ] 2.5. Postar no grupo a mensagem 3 (boas-vindas) copiada de `ALPHA-INVITE-MESSAGE.md`, personalizando `{DATA_KICKOFF}` e `{LINK_FORMULARIO}`.

### Pre-requisito critico

O **link do formulario** precisa JA existir (criado na Fase 0 do PLAYBOOK a partir de `ALPHA-FEEDBACK-TEMPLATE.md`). Se nao existe, criar AGORA antes de seguir:

1. Abrir Tally → Novo formulario → copiar as 28 perguntas de `ALPHA-FEEDBACK-TEMPLATE.md`.
2. Configurar: limit 1 resposta por usuario (via browser fingerprint ou login), publicado em modo link.
3. Copiar link publico e colar em `ALPHA-INVITE-MESSAGE.md` bloco 3 substituindo `{LINK_FORMULARIO}`.

### Saida esperada

5 alphas no grupo + mensagem de boas-vindas postada.

### Verify

```bash
test -f /home/projects/ForgeClaw/.plano/fases/31-*/ALPHA-INVITE-MESSAGE.md
echo "Jonathan confirma: grupo criado, 5 alphas dentro, mensagem 3 postada."
# Registrar confirmacao em DAILY-STANDUP.md linha T-1
```

---

## SECAO 3: Kickoff call + grant de acesso (D0)

Corresponde a PLAN 31-02 Task 5.

### Pre-call (Z-0:30)

- [ ] 3.1. Rodar pre-call checklist do script (`ALPHA-ONBOARDING-CALL-SCRIPT.md`).
- [ ] 3.2. Abrir terminal com `bun run ops/gate/access.ts list` pronto.
- [ ] 3.3. Colar handles dos 5 alphas num bloco de notas ao lado do terminal.
- [ ] 3.4. Confirmar que formulario ta publicado e link funciona.

### Durante a call (30 min + 15 Q&A)

- [ ] 3.5. Iniciar gravacao.
- [ ] 3.6. Executar os 7 blocos do roteiro em ordem (Boas-vindas 3' / Produto 2' / Expectativa 5' / Metricas 3' / Grant ao vivo 5' / Proximos passos 3' / Q&A 5').
- [ ] 3.7. No Bloco 5 (entrega de acesso ao vivo), para cada um dos 5, rodar no terminal compartilhado:
  ```bash
  cd /home/projects/ForgeClaw
  bun run ops/gate/access.ts grant <github-username> \
      --member-email=<email> \
      --note="alpha fase 31 $(date +%Y-%m-%d)"
  ```
- [ ] 3.8. Apos todos os 5 grants, rodar `bun run ops/gate/access.ts list` e mostrar na call.
- [ ] 3.9. Encerrar call.

### Pos-call

- [ ] 3.10. Salvar gravacao:
  ```bash
  mkdir -p /home/projects/ForgeClaw/.plano/fases/31-*/recordings/
  mv ~/Downloads/meet-recording.mp4 \
     /home/projects/ForgeClaw/.plano/fases/31-*/recordings/kickoff-$(date +%Y-%m-%d).mp4
  ```
- [ ] 3.11. Atualizar `DAILY-STANDUP.md` linha D0 com horario real, nomes dos 5 alphas, duvidas na call, primeiras impressoes.
- [ ] 3.12. Criar os 5 arquivos individuais de observacao (substituir `alpha1..5` pelos handles reais):
  ```bash
  cd /home/projects/ForgeClaw/.plano/fases/31-*/
  mkdir -p observations
  for user in alpha1 alpha2 alpha3 alpha4 alpha5; do
    cp ALPHA-OBSERVATION-SHEET.md observations/$user.md
  done
  ```
- [ ] 3.13. Em cada arquivo `observations/<user>.md`, trocar `{github-username}` pelo handle real e preencher nome, nivel, arquetipo, SO, datas.

### Verify automatico

```bash
cd /home/projects/ForgeClaw
test -f ops/gate/access-log.jsonl \
  && test $(grep -c "\"action\":\"grant\"" ops/gate/access-log.jsonl) -ge 5 \
  && test -d .plano/fases/31-*/observations \
  && test $(ls .plano/fases/31-*/observations/*.md 2>/dev/null | wc -l) -eq 5 \
  && ls .plano/fases/31-*/recordings/kickoff-*.mp4 2>/dev/null
```

---

## SECAO 4: Observacao diaria por 7 dias (D0 tarde ate D+7)

Corresponde a PLAN 31-02 Task 6.

### Regra diaria critica: **NAO AJUDAR nas primeiras 24h**

Quando um alpha manda no grupo "to travado em X", a resposta padrao de Jonathan e:

> "Anota o ponto exato (screenshot ou copia o erro). Tenta mais uma vez daqui 20 min. Se continuar travado quando passar 24h do kickoff, a gente olha junto."

Vale para TODOS os 5 na primeira tentativa de install. **Excecao unica:** bug critico (crash imediato, dashboard nao abre). Nesse caso reconhecer e fixar.

### Ritual diario (5-10 min, todo fim de dia idealmente 22h)

#### Passo 1: Ler o grupo (2 min)

- [ ] Abrir o grupo privado do Telegram. Ler TODAS mensagens novas desde o ultimo checkin.

#### Passo 2: Para cada alpha ativo (5-7 min totais)

- [ ] Abrir `observations/<username>.md`. No bloco do dia atual, preencher:
  - Mensagens aprox. (contar pelo bot ou estimar pelo grupo)
  - Marcar abas mencionadas
  - Anotar se pingou no grupo/DM
  - Se pingou com bug, classificar gravidade
  - Notas livres (impressoes, palavras-chave que ele usou)

#### Passo 3: Para cada bug reportado (variavel)

- [ ] Adicionar linha em `BUG-TRIAGE.md`.
- [ ] Abrir issue no GitHub com label apropriada:
  ```bash
  cd /home/projects/ForgeClaw
  gh issue create \
    --title "[alpha-critical] <titulo curto>" \
    --body "Reportado por @<alpha-username> em <data>. <descricao>" \
    --label "alpha-critical"
  ```
- [ ] Se critico: **PARAR TUDO**, fixar agora, push pra main:
  ```bash
  git checkout -b fix/alpha-<issue-n>
  # fazer fix
  git commit -m "fix: <descricao> (closes #<issue>)"
  git push origin fix/alpha-<issue-n>
  gh pr create --fill
  gh pr merge --squash
  ```
- [ ] Depois comunicar no grupo:
  > "Fix para {bug} foi pra main (commit <sha>). Quem tava travado nisso pode `cd ~/forgeclaw && git pull && bun install && forgeclaw update` e retomar."

#### Passo 4: Para cada friction reportado (1 min)

- [ ] Adicionar linha em `FRICTION-LOG.md`. **Nao fixar. So registrar.**

#### Passo 5: Resumir o dia em DAILY-STANDUP.md (2 min)

Preencher o bloco do dia com: pontos do dia, grants novos (so D0 tem), bugs reportados (numeros do BUG-TRIAGE), bugs fixados (commit shas), friction (numeros do FRICTION-LOG), alphas silenciosos, acao amanha.

### Checkpoint especial D+3: Mid-alpha

- [ ] Abrir todos os 5 observation sheets.
- [ ] Contar quantos estao ativos (postaram no grupo ou enviaram mensagem nos ultimos 2 dias).
- [ ] Para os silenciosos, mandar DM gentil (NAO apressado):
  > "oi {nome}, ta tudo bem? nao te vi postar nos ultimos dois dias. instalou OK? ta usando?"
- [ ] Registrar resposta no observation sheet dele.
- [ ] Em `DAILY-STANDUP.md`, na linha D+3, destacar status de engajamento dos 5.

### Checkpoint D+6: Recado de cut-off

- [ ] Postar no grupo:
  > "Galera, faltam 24h pro cut-off. Formulario aqui: {link}. Primeiros que entregarem eu analiso primeiro — feedback cedo = mais influencia no release."

### Regra "fim do dia" operacional

Idealmente todo fim de dia as 22h. Se pular um dia, recuperar no dia seguinte dobrado — **nao deixar acumular mais que 48h** ou a qualidade do dado degrada (memoria humana descarta friction).

### Saida esperada por dia

5 observation sheets atualizados + DAILY-STANDUP com linha do dia + BUG-TRIAGE atualizado se houver bug + FRICTION-LOG atualizado se houver friction.

### Verify automatico

```bash
cd /home/projects/ForgeClaw
D=$(ls .plano/fases/31-*/observations/*.md | wc -l)
test "$D" -eq 5 \
  && grep -c "^### " .plano/fases/31-*/DAILY-STANDUP.md \
     | awk '{ if ($1 >= 9) exit 0; else { print "DAILY-STANDUP tem so " $1 " linhas"; exit 1 } }'
```

---

## SECAO 5: Cut-off e coleta de CSV (D+6 ate D+8)

Corresponde a PLAN 31-02 Task 7.

### D+6, 09h: Reforco publico

- [ ] Postar no grupo (nao mandar DM individual ainda, criar pressao social primeiro):
  > "Galera, 24h pro cut-off. Formulario: {link}. Quem ja preencheu, obrigado. Quem nao preencheu, lembrete: o release geral depende desses dados."

### D+7, 09h: Cut-off oficial

- [ ] Postar:
  > "Hoje e o ultimo dia do alpha. Formulario fecha a meia-noite. Se nao deu pra preencher ainda, 15-20 min e o suficiente. Brigadao a quem ja entregou."

### D+7, 18h: DM individual para quem nao preencheu

- [ ] Checar no Tally/Google Forms quem respondeu. Para os que nao, DM individual:
  > "oi {nome}, vi que o formulario ainda ta em aberto. Se tiver 15 min antes da meia-noite, preenche pra mim: {link}. Teu feedback eh um dos 5 que decidem o release geral."

### D+7, 23h: Cut-off final

- [ ] Trancar o formulario:
  - **Tally:** Settings → Close form
  - **Google Forms:** Responses → Not accepting responses

### D+8, 09h: Export CSV

**No Tally:**

1. Abrir o formulario → aba Submissions.
2. Export to CSV.
3. Baixar arquivo.

**No Google Forms:**

1. Abrir formulario → aba Responses.
2. Icone Google Sheets → create/open sheet.
3. Sheet: File → Download → CSV.

**Salvar em caminho canonico (exigido pelo PLAN 31-03):**

```bash
# Caminho absoluto pra evitar ambiguidade
PHASE_DIR="/home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-o-antes-do-release-geral"

# Mover o CSV pra pasta da fase com nome padrao
mv ~/Downloads/*.csv "$PHASE_DIR/feedback-responses.csv"

# Verificar que o arquivo esta la
test -f "$PHASE_DIR/feedback-responses.csv" && echo "CSV OK"
```

### D+8, 10h: Conferir cobertura

- [ ] Abrir o CSV. Contar linhas (desconsiderar header):
  ```bash
  PHASE_DIR="/home/projects/ForgeClaw/.plano/fases/31-..."
  L=$(wc -l < "$PHASE_DIR/feedback-responses.csv")
  echo "Linhas totais (com header): $L → respostas: $((L-1))"
  ```

- **5 respostas:** otimo, seguir pra PLAN 31-03.
- **4 respostas:** aceitavel, seguir mas registrar em DAILY-STANDUP linha D+8 quem nao respondeu.
- **3 ou menos:** DM urgente para os faltantes "voce topou compromisso formal de preencher, preciso desse dado". Se nao preencherem em mais 24h, registrar como dado parcial e seguir.

### D+8, 11h: Encerrar o grupo (opcional)

- [ ] Postar no grupo:
  > "Alpha oficialmente encerrado. Obrigado a todos. Vou consolidar em relatorio nos proximos 2-3 dias. O grupo fica aberto por mais 7 dias pra quem quiser continuar testando. Depois disso, se der tudo certo no PLAN 31-03, a gente migra voces pro grupo geral da comunidade quando o release for pra todos."

### D+8, 12h: Atualizar DAILY-STANDUP.md linha D+8

- [ ] Preencher com: pontos do dia (numero de respostas, percepcao geral), nenhum grant novo, nenhum bug novo (a partir daqui seguem no backlog, nao sao mais "alpha-critical"), nenhum fix novo, friction N/A, alphas silenciosos (quem nao respondeu), acao amanha (abrir PLAN 31-03 e comecar consolidacao).

### Verify automatico

```bash
PHASE_DIR="/home/projects/ForgeClaw/.plano/fases/31-alpha-com-cinco-membros-da-comunidade-sele-o-de-perfis-diferentes-observa-o-de-instala-o-sem-ajudar-coleta-de-friction-points-itera-o-antes-do-release-geral"
test -f "$PHASE_DIR/feedback-responses.csv" \
  && L=$(wc -l < "$PHASE_DIR/feedback-responses.csv") \
  && test "$L" -ge 4 \
  || { echo "CSV existe mas tem menos de 4 linhas (header + 3 respostas)"; exit 1; }
```

---

## Checklist final antes de abrir PLAN 31-03

- [ ] `ops/gate/access-log.jsonl` contem >=5 entries novas com action=grant do D0
- [ ] `bun run ops/gate/access.ts list` mostra os 5 alphas como collaborators com permission=pull
- [ ] `observations/` tem 5 arquivos individuais, todos com campos D0 ate D+7 preenchidos
- [ ] `DAILY-STANDUP.md` tem >=9 entradas diarias (T-1, D0, D1..D7, D+8)
- [ ] `BUG-TRIAGE.md` lista >=0 bugs (zero e aceitavel se produto estava solido); todos bugs criticos tem `status=fixed` e `fix commit` preenchido; SLA de <=24h atingido para todos criticos
- [ ] `FRICTION-LOG.md` acumula friction points do alpha (pode ser qualquer numero, inclusive zero)
- [ ] Gravacao `recordings/kickoff-*.mp4` existe
- [ ] `feedback-responses.csv` tem pelo menos 3 respostas (idealmente 5); se <3, registrar "dado parcial" em DAILY-STANDUP D+8
- [ ] Nenhuma evidencia de Jonathan ter fornecido ajuda individualizada nas primeiras 24h de cada alpha (exceto para bugs criticos) — verificavel em DAILY-STANDUP e observation sheets
- [ ] Todos os bugs criticos tem issue linkada em github.com/Ecoupdigital/forgeclaw/issues

Se tudo ok: **seguir para PLAN 31-03** (consolidacao + relatorio final + decisao de release).

---

## Ferramentas mentais durante o alpha

Repetidas do PLAYBOOK porque Jonathan vai precisar:

1. **Voce e PM, nao suporte.** Se travar em ajudar, lembra que seu papel aqui e observar — nao salvar.
2. **Anota bruto.** Se rabiscar "cara nao gostou do roxo" hoje, pode ser que vire feature de temas semana que vem.
3. **Nao leve pro pessoal.** NPS 6 nao e critica a voce — e dado pra corrigir o produto.
4. **O silencio tambem e dado.** Quem nao usa o produto e quem mais te ensina se o produto e necessario.
