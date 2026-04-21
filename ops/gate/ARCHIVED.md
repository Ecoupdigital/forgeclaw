# ops/gate — ARQUIVADO em 2026-04-21

Este diretorio contem o **script v1 de gate via GitHub collaborators** criado na Fase 29 (repo privado + invite manual ao assinar comunidade).

## Por que arquivado

Pivot estrategico em 2026-04-21:

- Modelo atual: **npm publico**. Qualquer pessoa pode `npx forgeclaw install`.
- Acesso ao codigo nao e mais o gate — o **"como usar bem"** (aulas, suporte, templates curados, comunidade) e o valor.
- Sem granting/revoking de collaborators. Sem dependencia de GitHub PAT.
- Precedentes: Tailwind, shadcn/ui, Laravel — codigo livre, ecossistema pago.

## Quando voltar a usar este script

Se no futuro voce decidir:

1. **Fechar o repo** (privar de novo) e controlar acesso via invite
2. **Oferecer alguma parte premium** so pra membros da comunidade (ex: packages/enterprise/)
3. **Migrar pra modelo de license key validada no install** (outra arquitetura)

Este script permanece funcional. Basta:

1. Privatizar o repo de volta:
   ```bash
   curl -X PATCH "https://api.github.com/repos/Ecoupdigital/forgeclaw" \
     -H "Authorization: Bearer $GITHUB_TOKEN" \
     -d '{"private":true}'
   ```
2. Regenerar o PAT com escopo `Administration: Read and write` (v1 original nao tinha — bug documentado em `.plano/fases/29-*/deferred-items.md`)
3. Retornar ao fluxo original descrito em `README-GATE.md`

## Estado atual

- Script ainda compila e roda (`bun run access.ts list` funciona se PAT tiver escopo)
- Bug conhecido do PAT: o gate.env atual tem PAT com escopo insuficiente pra grant/revoke
- Testes vitest ainda passam (4/4 em access.test.ts)
- Log de audit preservado em `access-log.jsonl`

## Proximo passo (se algum dia voltar)

Ler `.plano/fases/29-gate-de-acesso-pela-comunidade-v1-simples-com-repo-privado-e-invite-manual-no-github-ao-assinar-comunidade-documenta-o-de-fluxo-de-concess-o-e-revoga-o/V2-ROADMAP.md` — descreve a arquitetura v2 (webhook Asaas → Gate API → GitHub) que nunca foi implementada.
