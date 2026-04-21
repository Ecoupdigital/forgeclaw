# Fase 29 — Itens Adiados

## 29-02 Task 5 — Smoke test E2E do CLI access gate (CHECKPOINT HUMANO)

**Status:** DEFERRED — requer acao manual do Jonathan.

**Por que nao foi feito automaticamente:**
O plano marcou Task 5 como `type="checkpoint:human-verify"`, exigindo:

1. Conta GitHub alternativa do Jonathan (ex: `jonathanrenan-test` ou qualquer conta que ele controle)
2. Acesso ao email dessa conta pra conferir se o convite chega
3. Julgamento humano sobre UX do fluxo de invite (tempo de entrega, copy do email do GitHub, etc)

Nenhum desses pre-requisitos e automatizavel por agente. O CLI ja foi validado end-to-end via:

- `bun run ops/gate/access.ts list` contra API real do GitHub retornou `@Ecoupdigital admin` — confirma conectividade, auth, parsing de resposta, paginacao
- `GITHUB_TOKEN=fake ... list` retornou 401 Bad credentials — confirma tratamento de erro
- Suite vitest (4 testes) cobre help/token missing/username invalid/audit vazio

O que falta: provar que `grant` + `revoke` + `revoke idempotente` rodam end-to-end com invite real chegando em inbox real.

### BUG CRITICO DESCOBERTO — PAT sem escopo de Administration (2026-04-21)

Smoke test parcial rodado sem conta externa revelou que o PAT atual em `ops/gate/gate.env` NAO TEM escopo pra `grant`/`revoke`:

```
list → OK (Ecoupdigital admin)
grant Ecoupdigital → 422 "Repository owner cannot be a collaborator" (esperado — owner)
grant forgeclaw-smoke-fake-user-xyz-404 → 403 "Resource not accessible by personal access token"
revoke forgeclaw-smoke-fake-user-xyz-404 → 403 "Resource not accessible by personal access token"
```

O 403 no grant de usuario fake deveria ter sido 404 "user not found". O fato de ter vindo 403 prova que o PAT nao tem permissao de gravar collaborators — o endpoint inteiro esta bloqueado.

**Implicacao:** produto esta QUEBRADO pra fluxo principal. Se o Jonathan tentar convidar o primeiro membro da comunidade hoje, vai dar 403.

**Correcao (obrigatoria antes do alpha):**

1. Ir em https://github.com/settings/personal-access-tokens/new (fine-grained) ou https://github.com/settings/tokens (classic)
2. Se fine-grained: escolher repo `Ecoupdigital/forgeclaw` + permissao `Administration: Read and write` + `Metadata: Read`
3. Se classic: escopo `repo` (tudo) funciona
4. Substituir o valor de `GITHUB_TOKEN=` em `/home/projects/ForgeClaw/ops/gate/gate.env`
5. Re-rodar `bun run ops/gate/access.ts grant <conta-teste>` — agora deve funcionar

Registrar em `members.jsonl` so depois que um grant real passar com sucesso.

---

## Runbook para o Jonathan rodar o smoke test

**Tempo estimado:** 5-8 minutos.

**Pre-requisitos:**

- [ ] 29-01 completo (repo privado — ja esta)
- [ ] `ops/gate/gate.env` preenchido com PAT valido — se foi apagado, recuperar:
  ```bash
  cd /home/projects/ForgeClaw
  cp ops/gate/gate.env.example ops/gate/gate.env
  # editar e colar o PAT de ~/.claude/projects/-home-vault/memory/reference_github_token_ecoup.md
  chmod 600 ops/gate/gate.env
  ```
- [ ] Conta GitHub alt que voce controla (pode ser pessoal vs EcoUp, ou uma conta de teste dedicada)
- [ ] Email dessa conta acessivel (pra ver o convite)

### Passos

**1. Listar collaborators atuais (baseline):**
```bash
cd /home/projects/ForgeClaw
bun run ops/gate/access.ts list
```
Esperado: `@Ecoupdigital (role=admin) | Total: 1`.

**2. Conceder acesso a conta alt:**
```bash
bun run ops/gate/access.ts grant <SEU-USERNAME-ALT> \
    --member-email=smoke@test.local \
    --note="smoke test fase 29-02"
```
Troque `<SEU-USERNAME-ALT>` pelo username da conta alternativa (ex: `jonathanrenan`, `jo-personal`, etc).
Esperado: `OK: convite enviado para @<user> (permission=pull).`

**3. Verificar inbox da conta alt:**
- Abrir o email da conta alternativa
- Deve ter um email do GitHub com subject tipo "Ecoupdigital has invited you to collaborate on Ecoupdigital/forgeclaw"
- NAO aceitar o convite ainda — o teste e so sobre o fluxo da API do GitHub, nao sobre render HTML do email
- Confirmar que o email chegou em <5min (se demorar mais, anotar — pode indicar que username invalido nao bloqueia o invite antes de enviar)

**4. Listar de novo:**
```bash
bun run ops/gate/access.ts list
```
A conta alt deve aparecer como pending collaborator. O `role` pode variar ate o convite ser aceito — focar em `Total: 2`.

**5. Revogar acesso:**
```bash
bun run ops/gate/access.ts revoke <SEU-USERNAME-ALT> \
    --reason="smoke test cleanup"
```
Esperado: `OK: @<user> removido do repo Ecoupdigital/forgeclaw.`

**6. Testar idempotencia (revoke duas vezes):**
```bash
bun run ops/gate/access.ts revoke <SEU-USERNAME-ALT>
```
Esperado: `NOOP: @<user> nao era collaborator (nada a fazer).`

**7. Ver audit trail:**
```bash
bun run ops/gate/access.ts audit
```
Esperado: 4+ linhas — pelo menos `grant ok`, `list ok`, `revoke ok`, `revoke noop`.

### Cleanup opcional

Se preferir manter `members.jsonl` limpo (ja que a conta alt foi smoke test, nao e membro real da comunidade):
```bash
# Remover a linha do smoke test
grep -v "smoke@test.local" ops/gate/members.jsonl > ops/gate/members.jsonl.tmp
mv ops/gate/members.jsonl.tmp ops/gate/members.jsonl
```

O `access-log.jsonl` NAO deve ser editado — e audit trail.

### Se algo falhar

| Erro | Causa provavel | Fix |
|------|----------------|-----|
| `ERROR 401 Bad credentials` | PAT expirado ou invalido | Regenerar PAT em github.com/settings/tokens, atualizar gate.env |
| `ERROR 403 Forbidden` | Fine-grained PAT sem `Administration: Write` | Em github.com/settings/personal-access-tokens, adicionar scope ao PAT |
| `ERROR 404 Not Found` | REPO_OWNER ou REPO_NAME errado em gate.env | Editar pra `REPO_OWNER=Ecoupdigital`, `REPO_NAME=forgeclaw` |
| Convite nao chega | Settings do GitHub da conta alt com notifications desligadas | github.com/settings/notifications da conta alt |
| `ERROR: github-username invalido` | Espaco, acento, underscore, > 39 chars | GitHub username e `[a-zA-Z0-9-]{1,39}` — sem underscore |

### Validacao final do smoke test

Quando os 7 passos passarem:

1. Marcar Task 5 como OK no PLAN (editar frontmatter se quiser, ou so deixar o SUMMARY registrar)
2. Anexar uma linha ao `.plano/STATE.md` na secao Decisoes: `[2026-MM-DD][29-02] Smoke test E2E completo com conta <username>: grant ok, list mostrou pending, revoke ok, revoke idempotente ok, audit trail com 4+ linhas, convite chegou em <Xmin>.`
3. (Opcional) rodar `cd /home/projects/ForgeClaw && git log --oneline | grep 29-02` e tirar screenshot se quiser prova.

Nao precisa commit adicional — access-log.jsonl e gitignored e o state update e 1 linha.
