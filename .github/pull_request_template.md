## O que muda

<!-- 2-3 linhas explicando a mudanca. -->

## Tipo de mudanca

- [ ] Bug fix (nao quebra API existente)
- [ ] Feature nova (nao quebra API existente)
- [ ] Breaking change (muda comportamento publico)
- [ ] Doc/chore (nao muda codigo de runtime)

## Area afetada

- [ ] `packages/core/` (motor, runner, memoria)
- [ ] `packages/bot/` (Telegram, handlers)
- [ ] `packages/dashboard/` (UI, APIs)
- [ ] `packages/cli/` (installer, comandos)
- [ ] `docs/` (documentacao)
- [ ] `scripts/`, `ops/` (ferramentas e infra)

## Como foi testado

<!-- Descreva os passos manuais e/ou testes automatizados que rodaram. -->

```bash
# comandos usados
```

## Checklist antes de abrir PR

- [ ] Testei localmente com `bun run dev` (bot + dashboard)
- [ ] `bun run typecheck` passa sem novos erros
- [ ] Atualizei docs se mudei comportamento publico (README, docs/*.md)
- [ ] Adicionei CHANGELOG entry em 'Unreleased' se mudanca visivel
- [ ] Nao commitei tokens, env, DB, dados pessoais
- [ ] Se adicionei dep, confirmei que e necessaria e nao duplica algo existente

## Contexto adicional

<!-- Links para issue relacionado, decisoes importantes, screenshots. -->
