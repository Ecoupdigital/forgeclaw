# ForgeClaw Access Gate v2 — Roadmap

> Status: **decidido mas NAO implementado**. Referencia para quando o gate v1 manual comecar a doer (estimativa: > 20 membros ativos).

## Problema que v2 resolve

V1 exige Jonathan rodar `bun run ops/gate/access.ts grant` manualmente toda vez que alguem assina, e `revoke` toda vez que alguem cancela. Funciona ate ~10-20 membros. Acima disso, vai haver:

- Latencia entre pagamento e acesso (membro espera horas/dias).
- Risco de esquecer de revogar (membro cancela mas mantem acesso).
- Risco de erro de digitacao no username.

## Arquitetura proposta (v2)

Fluxo:

1. Asaas processa pagamento (PAYMENT_CONFIRMED) ou cancelamento (SUBSCRIPTION_DELETED) e dispara webhook.
2. Edge Function `asaas-webhook` (Supabase, ja existe em `comunidade-dominandoautoia/supabase/functions/asaas-webhook/index.ts`) recebe o evento, processa enrollment local e entao dispara webhook interno para o Gate API.
3. Gate API (novo servico) recebe POST HTTP com assinatura HMAC-SHA256, deduplica por event_id em SQLite, e chama a mesma logica do `access.ts` v1 para conceder/revogar acesso no GitHub.
4. Gate API notifica Jonathan via Telegram bot em caso de erro (ForgeClaw proprio ja tem bot, reusar).
5. Gate API persiste todo evento processado em SQLite (`gate.db`) para audit.

Stack do Gate API:
- Runtime: Bun HTTP (`Bun.serve`, sem framework).
- Deploy: Coolify em VPS prod 178.104.117.59.
- Domain: `forgeclaw-gate.ecoup.digital`.
- Persistencia: SQLite em volume persistente.

## Pre-requisitos (que ainda nao estao prontos)

1. **Campo `github_username` no perfil do membro** da comunidade.
   - Local: tabela `profiles` ou equivalente em `comunidade-dominandoautoia/supabase`.
   - Migration necessaria: adicionar coluna `github_username TEXT` e coletar no cadastro.
   - UI: input no `/profile` com validacao de regex `^[a-zA-Z0-9-]{1,39}$`.
   - Sem isso, o webhook nao tem o que mandar. **Esta e a maior barreira — feature de produto na comunidade, nao no ForgeClaw.**

2. **Deploy do Gate API em Coolify.**
   - Projeto novo em Coolify (VPS 178.104.117.59).
   - Stack: Bun HTTP server (`Bun.serve` direto, sem framework).
   - Subdomain: `forgeclaw-gate.ecoup.digital`.
   - Env: `GITHUB_TOKEN`, `HMAC_SECRET`, `TELEGRAM_BOT_TOKEN` (pra notificar Jonathan), `SQLITE_PATH`.

3. **HMAC compartilhado entre `asaas-webhook` e o Gate API.**
   - Gerar uma vez, armazenar em Supabase Secrets (edge function) e em Coolify env (gate api).
   - Spec: `sha256hmac(secret, body)` no header `X-Gate-Signature`.

## Contratos de API

### `POST /hook` (Gate API recebe)

Headers:
- `Content-Type: application/json`
- `X-Gate-Signature: sha256=<hex>` — HMAC-SHA256 do body cru com o secret.
- `X-Gate-Event-Id: <uuid>` — identificador unico para deduplicacao.

Body:
```json
{
  "action": "grant" | "revoke",
  "github_username": "fulanosilva",
  "member_email": "fulano@email.com",
  "member_id": "uuid-da-comunidade",
  "subscription_id": "sub_xxx",
  "reason": "PAYMENT_CONFIRMED" | "SUBSCRIPTION_DELETED" | "MANUAL",
  "event_ts": "2026-04-21T12:00:00Z"
}
```

Response:
- `200 OK { "status": "ok", "result": "granted|revoked|noop", "collaborator_status": "invited|active|removed" }`
- `202 Accepted` se deduplicado (event_id ja visto).
- `400 Bad Request` se body invalido.
- `401 Unauthorized` se HMAC invalido.
- `409 Conflict` se o github_username nao e valido (regex fail).
- `500 Internal Server Error` se GitHub API falhou (retry na origem via back-off).

Timeout: 30s. Retry da origem: 3x com backoff exponencial (1s, 4s, 16s).

### `GET /status` (healthcheck, sem auth)

Retorna `200 OK { "ok": true, "version": "2.0.0", "uptime_s": 12345 }`.

### `GET /admin/audit?tail=N` (com bearer token de admin)

Retorna ultimas N entradas do audit log em JSON. Le de `gate.db` (SQLite), nao do `.jsonl` do v1.

## Schema SQLite (v2)

```sql
CREATE TABLE gate_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  received_at TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('grant','revoke')),
  github_username TEXT NOT NULL,
  member_email TEXT,
  member_id TEXT,
  subscription_id TEXT,
  reason TEXT,
  event_ts TEXT,
  processed_at TEXT,
  result TEXT CHECK (result IN ('ok','noop','error')),
  github_status_code INTEGER,
  error_message TEXT
);
CREATE INDEX idx_gate_events_username ON gate_events(github_username);
CREATE INDEX idx_gate_events_member ON gate_events(member_id);
```

## Mudancas no `asaas-webhook` da comunidade (pseudo-codigo)

No arquivo `comunidade-dominandoautoia/supabase/functions/asaas-webhook/index.ts`, apos o switch de eventos:

```typescript
// Apos processar PAYMENT_CONFIRMED ou SUBSCRIPTION_DELETED
if (event === 'PAYMENT_CONFIRMED' && externalRef) {
  const profile = await getProfileByEmail(...);
  if (profile?.github_username) {
    await fireGateHook({
      action: 'grant',
      github_username: profile.github_username,
      member_email: profile.email,
      member_id: profile.id,
      subscription_id: payment.subscription,
      reason: 'PAYMENT_CONFIRMED',
      event_ts: new Date().toISOString(),
    });
  }
}

if (event === 'SUBSCRIPTION_DELETED') { /* similar pra revoke */ }
```

Funcao `fireGateHook` faz fetch POST com HMAC. Em caso de erro, NAO bloquear o webhook principal — emitir um alert pra Jonathan via Telegram.

## Migracao v1 -> v2

1. Stop-and-continue: v1 continua funcionando ate v2 estar rodando com 1 semana estavel.
2. Seedar `gate_events` com o conteudo atual de `members.jsonl` e `access-log.jsonl` (via script one-shot).
3. Flipar `asaas-webhook` para chamar o Gate API.
4. V1 script vira "break glass" (rodar so se v2 cair).

## Decisoes abertas

- **Qual plataforma da comunidade?** Hoje e projeto proprio (React+Vite+Supabase em `/home/projects/comunidade-dominandoautoia`). Se migrar pra Kiwify/Eduzz/Hotmart no futuro, o webhook muda — redesenhar o contrato. V2 assume plataforma propria.
- **Notificar o membro quando convite e enviado?** Provavelmente sim — email via Resend. Definir antes de implementar.
- **Grace period no revoke?** Membro cancela — esperar 7 dias antes de revogar, ou imediato? Produto decide. Proposta: 7 dias pra dar tempo de contato em caso de problema de pagamento (chargeback, cartao expirado).
- **License key no CLI (bonus v2.5)?** `forgeclaw update` no CLI chama `https://forgeclaw-gate.ecoup.digital/validate?key=xxx` e aborta update se invalida. Protege mirror npm publico caso seja criado. FORA do escopo da fase 29, mover pra roadmap geral.

## Criterios de saida (quando vale implementar v2)

Implementar quando QUALQUER destas:
- [ ] 15+ membros ativos no repo
- [ ] 1 evento de "esqueci de conceder/revogar" reportado
- [ ] Jonathan passa mais de 30min/mes rodando o script manual
- [ ] Plataforma da comunidade ganha o campo `github_username` no perfil (pre-req #1 acima)

Enquanto NAO chegar a nenhum desses, v1 manual basta.

## Esforco estimado (dev solo + Claude)

| Item | Tempo Claude |
|------|--------------|
| Adicionar `github_username` na comunidade (migration + UI + validacao) | 60 min |
| Bun HTTP server com endpoint `/hook` | 45 min |
| HMAC validator + dedupe SQLite | 30 min |
| Integracao com `access.ts` logica existente | 20 min |
| Deploy Coolify + DNS + env | 40 min |
| Patch no `asaas-webhook` pra disparar | 30 min |
| Script de seed do members.jsonl -> gate.db | 20 min |
| Teste fim-a-fim manual | 45 min |
| **Total** | **~5h de Claude focado** |
