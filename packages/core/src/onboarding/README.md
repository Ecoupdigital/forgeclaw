# ForgeClaw Onboarding / Interviewer

System prompt fixo + motor de entrevista conversacional que customiza o harness do membro apos ele escolher um arquetipo (Fase 24).

## Arquitetura

```
onboarding/
├── types.ts                  # protocolo tipado (contrato unico)
├── interviewer.md            # system prompt FIXO (nao customizavel)
├── prompts.ts                # loader + validacao de response/diff
├── scripts/                  # roteiros por arquetipo (26-03)
│   ├── solo-builder.md
│   ├── content-creator.md
│   ├── agency-freela.md
│   ├── ecom-manager.md
│   └── generic.md
├── interviewer.ts            # motor (26-02)
├── merger.ts                 # aplica HarnessDiff (26-02)
├── budget.ts                 # tracker de turnos/tokens (26-02)
└── index.ts                  # barrel export
```

## Protocolo

O Entrevistador processa UM turno por vez:

```
input:  InterviewState + mensagem do usuario
output: InterviewResponse (asking | done | aborted)
```

`InterviewResponse` vem embutido em um bloco `` ```json ... ``` `` dentro do texto
do modelo. `extractJsonBlock` localiza, `validateInterviewResponse` valida.

### Status `asking`

Entrevistador ainda precisa de mais contexto. Retorna `nextQuestion` + `rationale?`.
UI (dashboard/CLI) exibe `nextQuestion` e aguarda input.

### Status `done`

Entrevistador finalizou. Retorna `summary` humano + `harnessDiff`. Motor aplica diff
via `merger.ts` e escreve nos arquivos em `~/.forgeclaw/harness/`.

### Status `aborted`

Usuario pediu pra sair ou entrevistador decidiu abortar (ex: contexto impossivel).
Motor nao aplica diff. Template base permanece intacto.

## HarnessDiff

Nao e overwrite de arquivo. E uma lista de operacoes:

- `append` — anexa ao fim (com `\n\n` separador).
- `replace` — substitui a primeira ocorrencia de `find` por `replace`. Erro se ausente.
- `replace_section` — troca o conteudo de uma secao H2 (`## Titulo`) ate o proximo H2.
  Flag `createIfMissing: true` cria se nao existir.
- `set_placeholder` — substitui `{{key}}` em todas as ocorrencias. Apenas chaves
  em `VALID_PLACEHOLDER_KEYS` sao aceitas.

## Budget

Default:

- 30 turnos totais (15 trocas pergunta-resposta)
- 80k tokens de input
- 20k tokens de output
- 15 minutos de wall clock

Quando qualquer um estoura, o motor forca `status: 'done'` (ou `aborted` se nada
foi coletado) e para de gastar tokens.

## Regras imutaveis

1. O system prompt (`interviewer.md`) NAO e customizavel pelo usuario.
2. O diff e sempre cirurgico. Template base do arquetipo continua funcionando
   mesmo com diff vazio.
3. Placeholders tem whitelist explicita (`VALID_PLACEHOLDER_KEYS`) — qualquer
   outro falha a validacao.
4. Todo turno e gravado em `InterviewState.turns` pra replay/debug.

## Auditoria

`InterviewState` preserva o historico completo (turns + budget + final diff).
Callers (dashboard, CLI) podem persistir em JSON pra inspecao posterior —
estrategia canonica: salvar em `~/.forgeclaw/onboarding/YYYY-MM-DD-<archetype>.json`.

## Integracoes futuras

- Fase 27 (dashboard onboarding) consome este modulo via `Interviewer.run()` +
  stream de `onTurn` callback.
- Fase 28 (`forgeclaw refine`) reusa a MESMA classe `Interviewer` passando o harness
  ja customizado como input — com isso o entrevistador re-pergunta apenas o que
  mudou.

## Exemplo de uso (preview — motor em 26-02)

```typescript
import { Interviewer } from '@forgeclaw/core/onboarding';

const itv = new Interviewer({
  archetype: 'content-creator',
  harnessDir: '/home/ana/.forgeclaw/harness',
  onTurn: (state) => console.log('turn', state.turns.length, state.status),
});

const firstQuestion = await itv.start();      // retorna InterviewResponse
const next = await itv.answer('Me chamo Ana');
// ... ate state.status === 'done'
const final = itv.getState();
```
