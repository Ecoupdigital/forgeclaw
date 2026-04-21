# ForgeClaw Access Gate v1

Script CLI que gerencia acesso ao repositorio privado `Ecoupdigital/forgeclaw` para membros da comunidade Dominando AutoIA.

**Fluxo atual (v1 manual):** Jonathan roda este script quando alguem assina ou cancela a comunidade. V2 sera automatizado via webhook da plataforma.

## Setup (uma vez)

1. Criar um GitHub PAT com escopo `repo` (classic) ou fine-grained PAT scopado a `Ecoupdigital/forgeclaw` com permissoes:
   - `Administration: Read and Write`
   - `Metadata: Read-only`
2. Copiar o template de env:
   ```bash
   cp ops/gate/gate.env.example ops/gate/gate.env
   # editar gate.env e colocar o token
   ```
   Alternativa: salvar em `~/.forgeclaw/gate.env` para reutilizar em outros workspaces.
3. Proteger o arquivo (ja esta no .gitignore, mas garantir permissao):
   ```bash
   chmod 600 ops/gate/gate.env
   ```

## Comandos

### Conceder acesso

```bash
bun run ops/gate/access.ts grant <github-username> \
    --member-email=<email-da-comunidade> \
    --note="texto livre"
```

Exemplo:
```bash
bun run ops/gate/access.ts grant fulanosilva \
    --member-email=fulano@email.com \
    --note="assinou em 2026-04-21"
```

Comportamento:
- Chama `PUT /repos/Ecoupdigital/forgeclaw/collaborators/<username>` com `permission=pull`.
- `201 Created` -> convite enviado (usuario ainda precisa aceitar no GitHub).
- `204 No Content` -> ja era collaborator (idempotente, so atualiza permissao).
- Loga em `ops/gate/access-log.jsonl`.
- Append em `ops/gate/members.jsonl` com email, note, timestamp.

### Revogar acesso

```bash
bun run ops/gate/access.ts revoke <github-username> \
    --reason="subscription cancelled"
```

Comportamento:
- Chama `DELETE /repos/Ecoupdigital/forgeclaw/collaborators/<username>`.
- `204 No Content` -> removido.
- `404 Not Found` -> nao era collaborator (idempotente).
- Loga em `access-log.jsonl`.

### Listar collaborators atuais

```bash
bun run ops/gate/access.ts list
bun run ops/gate/access.ts list --format=json
```

Mostra so collaborators *diretos* (adicionados por este script). Members da org ja tem acesso por outro caminho e nao aparecem.

### Ver historico de acoes

```bash
bun run ops/gate/access.ts audit
bun run ops/gate/access.ts audit --tail=100
```

Le `ops/gate/access-log.jsonl` (append-only). Cada linha tem `ts, actor, action, target, result, status_code, message`.

## Runbook — cenarios comuns

### Assinatura nova na comunidade

1. Receber notificacao do Asaas (email ou dashboard).
2. Abrir perfil do membro na comunidade, copiar o campo **GitHub username**.
3. Rodar:
   ```bash
   bun run ops/gate/access.ts grant <username> --member-email=<email>
   ```
4. Confirmar output `OK: convite enviado`.
5. (Opcional) avisar o membro no discord/whatsapp que o convite esta no email dele.

### Cancelamento

1. Receber notificacao de cancelamento (`SUBSCRIPTION_DELETED` do Asaas ou manual).
2. Buscar o github username do membro em `members.jsonl` ou em `list`:
   ```bash
   grep '<email>' ops/gate/members.jsonl
   ```
3. Rodar:
   ```bash
   bun run ops/gate/access.ts revoke <username> --reason="subscription cancelled <data>"
   ```
4. Confirmar `OK: removido`.

### Auditoria mensal

Uma vez por mes, rodar:
```bash
bun run ops/gate/access.ts list --format=json > /tmp/ghcollab.json
bun run ops/gate/access.ts audit --tail=1000 > /tmp/ghaudit.txt
```

Comparar com a lista de membros ativos no Asaas. Investigar qualquer diferenca.

## Limitacoes v1 (conhecidas, aceitaveis)

- Nao e automatico — depende de Jonathan rodar manualmente.
- Nao valida se o github username realmente existe antes de invitar (a API do GitHub simplesmente mantera o invite pendente se o usuario nao existir — sem dano real).
- `members.jsonl` e append-only; nao atualiza status quando revogado (ver `access-log.jsonl` para verdade).
- Nao integra com a plataforma da comunidade. V2 via webhook resolve isso.

## Proximos passos (v2, nao fazer agora)

Ver PLAN 29-03 — roadmap para automacao via webhook `asaas-webhook` -> Edge Function -> este script rodando em Coolify.
