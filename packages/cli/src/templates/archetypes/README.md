# ForgeClaw Archetype Templates

Cada arquetipo e uma pasta-irma aqui, com slug estavel como nome.
O CLI installer (Fase 25) le esta pasta via `loadArchetype(slug)` para
bootstrapar `~/.forgeclaw/harness/` no primeiro install.

## Slugs validos

Definidos em `types.ts` (`ARCHETYPE_SLUGS`):

- `solo-builder`
- `content-creator`
- `agency-freela`
- `ecom-manager`
- `generic`

## Estrutura obrigatoria por arquetipo

```
<slug>/
  archetype.json   <- metadata (validado pelo loader)
  SOUL.md          <- identidade e principios
  USER.md          <- perfil com placeholders
  AGENTS.md        <- agentes sugeridos para o perfil
  TOOLS.md         <- ferramentas/MCPs recomendados
  MEMORY.md        <- documentacao do sistema de memoria
  STYLE.md         <- guia de comunicacao
  HEARTBEAT.md     <- crons iniciais razoaveis
```

Todos os 8 arquivos sao obrigatorios. O loader joga erro se faltar algum.

## Placeholders universais

Todos os .md podem usar `{{key}}`. Chaves reconhecidas (definidas em
`types.ts` `PlaceholderMap`):

| Chave | Default | Fonte |
|---|---|---|
| `{{userName}}` | `""` | Pergunta no installer |
| `{{company}}` | `""` | Pergunta no installer |
| `{{role}}` | `""` | Pergunta no installer |
| `{{workingDir}}` | `""` | Pergunta no installer |
| `{{vaultPath}}` | `""` | Pergunta no installer |
| `{{timezone}}` | `America/Sao_Paulo` | Config |
| `{{today}}` | `YYYY-MM-DD` atual | Injetado pelo loader |

Tokens `{{...}}` nao reconhecidos sao preservados (debug-friendly).

## Schema do archetype.json

```jsonc
{
  "slug": "solo-builder",                 // == nome da pasta
  "name": "Solo Builder",                 // humano
  "description": "...",                   // max 160 chars
  "defaultRuntime": "claude-code",        // ou "codex"
  "voiceProvider": "groq",                // "groq" | "openai" | "none"
  "tags": ["dev","indie","vibecoding"],  // domain filters default
  "suggestedAgents": [
    {
      "name": "Code Agent",
      "description": "...",
      "tags": ["code","dev"]
    }
  ],
  "recommendedTools": ["GitHub MCP", "Shell", "..."],
  "icon": "*"                             // opcional
}
```

## API publica

```typescript
import {
  loadArchetype,
  listArchetypes,
  renderArchetype,
  type ArchetypeSlug,
} from '@forgeclaw/cli/templates/archetypes';

const tpl = loadArchetype('solo-builder');
const files = renderArchetype(tpl, {
  userName: 'Fulano',
  company: 'Acme',
  workingDir: '/home/fulano/projects',
});
// files['SOUL.md'], files['USER.md'], ..., files['HEARTBEAT.md']
```

## Regras para novos arquetipos

1. Cada arquetipo deve ser **distinguivel** dos outros (tom, agentes, crons diferentes).
2. `archetype.json` valido (passa `validateMeta`).
3. Todos os 7 .md preenchidos com conteudo REAL, nao placeholder puro.
4. Adicionar o slug em `types.ts` (`ArchetypeSlug` e `ARCHETYPE_SLUGS`).
5. Agentes sugeridos: tags MINUSCULAS, hifenizadas, sem acento. Ex: `financeiro`, `conteudo`, `dev`.
