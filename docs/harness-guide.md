# Harness Guide — Editando a Personalidade da Sua IA

O **harness** e o conjunto de 6 arquivos Markdown que definem quem e sua IA. Eles sao injetados como system prompt em toda chamada pro Claude. Voce pode edita-los no editor de texto ou no dashboard (aba **Personalidade**).

![screenshot](./screenshots/harness-editor.png)

## Onde ficam

```
~/.forgeclaw/harness/
  SOUL.md         # Identidade da IA, principios, tom
  USER.md         # Perfil do usuario (voce)
  AGENTS.md       # Agentes disponiveis e routing
  TOOLS.md        # Ferramentas built-in e integracoes
  MEMORY.md       # Memoria de longo prazo (compilada dos daily logs)
  STYLE.md        # Guia de formatacao e linguagem
```

Alem desses 6, existe o `~/.forgeclaw/HEARTBEAT.md` (tarefas agendadas — ver [crons.md](./crons.md)).

O instalador gera esses arquivos pre-preenchidos pelo [arquetipo](./archetypes.md) que voce escolheu + refinados pela entrevista conversacional.

## Cache por mtime

Se voce editar um arquivo, o proximo `ContextBuilder` detecta pelo `mtime` e recarrega. Nao precisa reiniciar bot nem dashboard.

## SOUL.md

**O que e:** identidade e principios da IA. Tom, valores, limites.

**Quando voce edita:** quando a IA esta "fora do tom" — falando formal demais, usando emoji que voce nao gosta, sendo verbose, etc.

**Exemplo do que colocar:**

```markdown
# SOUL

Voce e a IA pessoal de {{userName}}. Seu papel e ser parceira de trabalho,
nao babysitter.

Principios:
- Direta. Sem floreio.
- Se discorda, fala. Nao concorda so pra agradar.
- Se nao sabe, admite. Nao inventa.
- Portugues brasileiro, voce-forma.
- Sem emoji.
```

## USER.md

**O que e:** perfil detalhado de voce. Nome, empresa, role, preferencias, decisoes travadas.

**Quando voce edita:** quando mudou alguma coisa grande (emprego novo, projeto novo, decisao estrategica).

**Exemplo:**

```markdown
# USER

## Quem e
- Nome: {{userName}}
- Empresa: {{company}}
- Role: {{role}}
- Stack preferida: Bun + TypeScript + Next.js

## Projetos ativos
- ProjetoA — em desenvolvimento
- ProjetoB — manutencao

## Decisoes travadas
- Nao mencionar n8n (substitui por Claude Code)
- Financeiro roda em Asaas, nao ContaAzul
```

## AGENTS.md

**O que e:** lista de agentes disponiveis e regras de routing. Quando voce cria agentes via dashboard, eles aparecem aqui agregados.

**Quando voce edita:** raramente via mao. Prefira criar/editar agentes no dashboard (aba Agentes).

**Exemplo:**

```markdown
# AGENTS

## Disponiveis
- Code Agent — codigo, dev, refactor [tags: dev, code]
- Shipper — deploy, release [tags: ship, deploy]

## Routing
Se a mensagem for sobre codigo, preferir Code Agent.
Se for sobre deploy/CI, preferir Shipper.
```

## TOOLS.md

**O que e:** ferramentas built-in e integracoes (MCP servers, CLIs, APIs) que voce usa.

**Quando voce edita:** quando adicionou um MCP novo (ex: Asaas MCP), ou quando quer documentar um padrao de uso.

**Exemplo:**

```markdown
# TOOLS

## Built-in (sempre disponiveis)
- Read, Write, Edit — manipulacao de arquivo
- Bash — shell
- Grep, Glob — busca

## MCP Servers instalados
- Asaas MCP — cobrancas e NFS-e
- GitHub CLI (gh) — repos, PRs, issues

## Convencoes
- Commits: `tipo(escopo): mensagem`
- PRs: 1 PR por feature
```

## MEMORY.md

**O que e:** memoria consolidada de longo prazo. Cres com os daily logs e passa pelo janitor as 23h55.

**Quando voce edita:** raramente via mao. O sistema gerencia. Quando voce edita, prefira adicionar fatos novos — o janitor pode deduplicar depois.

**Como ver mais:** pagina **Memoria** do dashboard com busca FTS5.

## STYLE.md

**O que e:** guia de estilo de comunicacao. Formato de resposta, uso de emoji, linguagem.

**Quando voce edita:** quando a IA esta respondendo em formato que nao te serve (ex: muito longo, muito bullet point, muito header).

**Exemplo:**

```markdown
# STYLE

## Formatacao
- Respostas curtas por padrao. Expande so se pedido.
- Listas so quando >= 3 itens.
- Code block em toda comando shell.

## Linguagem
- Portugues brasileiro
- Voce-forma
- Zero emoji
- Termos tecnicos em ingles: API, endpoint, deploy (nao traduzir)
```

## HEARTBEAT.md

**O que e:** tarefas agendadas em portugues natural. Nao faz parte do harness strict sense, mas mora na mesma pasta e impacta comportamento proativo.

Doc dedicada: [crons.md](./crons.md).

## Compilacao

Os 6 arquivos do harness sao concatenados num `CLAUDE.md` unico que o bot referencia via `--append-system-prompt`. A compilacao e automatica:

- No install, chamando `compileHarness()` do core
- Apos editar via dashboard, pela mesma funcao
- No startup do bot, se o CLAUDE.md for mais antigo que qualquer harness file

Se voce quer forcar recompilacao manual:

```bash
bun run cli compile-harness   # comando auxiliar (ver `forgeclaw --help`)
```

## Recomendacoes editoriais

1. **Mantenha curto.** Harness gigante envenena contexto. Se USER.md passa de 3kb, quebra em secoes e arquiva detalhe antigo em MEMORY.md.
2. **Seja especifico.** "Direta" e generico. "Nao use 'voce pode/pode ser que', afirme ou pergunte" e util.
3. **Atualize quando mudar.** Perfil (USER.md) e stack (TOOLS.md) mudam com o tempo. Harness desatualizado faz IA errar.

## Problemas comuns

- [IA nao esta respeitando o tom do SOUL.md](./troubleshooting.md#tom-do-soul-ignorado)
- [Mudei o harness mas nao tomou efeito](./troubleshooting.md#harness-nao-atualiza)
