# Stack de Tecnologia — UP-CC

**Data da Analise:** 2026-04-09

## Linguagens

**Principal:**
- JavaScript (CommonJS) — Todo o codigo runtime: CLI tools, hooks, installer

**Secundaria:**
- Markdown (com XML estruturado) — Workflows, agents, commands, templates, references. Markdown e o formato primario do sistema; JS existe apenas como suporte CLI.
- YAML — Frontmatter em commands e agents (parseado manualmente, sem dependencia de parser YAML)

## Runtime

**Ambiente:**
- Node.js >= 16.7.0 (requisito minimo declarado em `package.json`)

**Gerenciador de Pacotes:**
- npm (publicado como `up-cc` no npm registry)
- Lockfile: ausente (zero dependencias — nao precisa de lockfile)

**Zero Dependencias:**
UP-CC tem **zero dependencias de producao**. `package.json` nao lista `dependencies` nem `devDependencies`. Todo o codigo usa apenas modulos built-in do Node.js: `fs`, `path`, `os`, `readline`, `child_process`.

## Frameworks

**Core:**
- Nenhum framework. O sistema e 100% meta-prompting: arquivos Markdown com XML estruturado que sao carregados pelo Claude Code (ou Gemini CLI / OpenCode) como slash commands e agent definitions.

**Testes:**
- Nenhum framework de teste no UP. (O repo contem testes para o sistema irmao GSD em `tests/*.test.cjs` usando runner custom, mas UP nao tem testes proprios.)

**Build/Dev:**
- Nenhum build step. Arquivos sao plain JS/MD publicados diretamente via npm.

## Dependencias Chave

**Criticas (zero deps externas):**
- `fs` (Node.js built-in) — Toda I/O de arquivos: ler STATE.md, escrever PLAN.md, etc.
- `path` (Node.js built-in) — Resolucao de caminhos cross-platform
- `child_process` (Node.js built-in) — Execucao de comandos git via `execSync`
- `os` (Node.js built-in) — Home directory, tmpdir para bridge files de hooks
- `readline` (Node.js built-in) — Interactive prompts no installer

**Infraestrutura de Runtime (fornecida pelo host):**
- Claude Code CLI — Runtime primario. Carrega commands/agents/workflows como slash commands.
- Gemini CLI — Runtime alternativo. Installer converte formatos automaticamente.
- OpenCode — Runtime alternativo. Installer converte formatos automaticamente.

**Integracao com Ferramentas Externas (via host CLI):**
- Playwright (MCP server) — Usado por UX Tester, Mobile First, Clone Builder, Builder E2E
- Context7 (MCP server) — Documentacao de bibliotecas em tempo real, usado pelo planejador
- WebFetch/WebSearch — Pesquisa de ecossistema e dominio

## Configuracao

**Ambiente:**
- Sem variaveis de ambiente obrigatorias para o UP em si
- `CLAUDE_CONFIG_DIR` — Override opcional do diretorio de config do Claude Code
- `GEMINI_CONFIG_DIR` — Override opcional para Gemini CLI
- `OPENCODE_CONFIG_DIR` / `XDG_CONFIG_HOME` — Override opcional para OpenCode
- Arquivo `.env` nunca e lido pelo UP (seguranca by design)

**Config do Projeto (criado em cada projeto usuario):**
- `.plano/config.json` — Configuracoes do workflow por projeto
  - `modo`: `"solo"` (commits diretos) ou `"time"` (branches por fase)
  - `paralelizacao`: `true`/`false` — Agentes rodam em paralelo
  - `commit_docs`: `true`/`false` — Commitar docs de planejamento
  - `auto_advance`: `true`/`false` — Encadear estagios automaticamente
  - `builder_mode`: `true`/`false` — Flag ativa durante builder mode
  - `builder_type`: `"full"` / `"light"` / `"clone"` — Tipo de builder

**Config Global (instalado em ~/.claude/):**
- `~/.claude/settings.json` — Hooks configurados automaticamente pelo installer:
  - `statusLine`: comando para `up-statusline.js`
  - `hooks.PostToolUse`: comando para `up-context-monitor.js`
- `~/.claude/up/builder-defaults.md` — Preferencias de stack/design do usuario para builder mode

**Build:**
- Nenhum. Publicacao direta via `npm publish`. Todos os arquivos listados em `package.json#files`: `bin`, `agents`, `commands`, `workflows`, `templates`, `references`, `hooks`.

## Requisitos de Plataforma

**Desenvolvimento:**
- Node.js >= 16.7.0
- Git (para commits atomicos e operacoes de estado)
- Um dos runtimes suportados: Claude Code, Gemini CLI, ou OpenCode

**Producao:**
- Nao aplicavel — UP-CC e uma ferramenta de desenvolvimento, nao um servico deployavel
- Instalado globalmente via `npx up-cc@latest --claude --global`
- Ou localmente no projeto via `npx up-cc@latest --claude --local`

## Publicacao npm

**Pacote:** `up-cc`
**Versao atual:** 0.4.0
**Binario:** `up-cc` (aponta para `bin/install.js`)
**Arquivos publicados:**
- `bin/` — Installer + CLI tools
- `agents/` — 33 definicoes de agentes (.md)
- `commands/` — ~25 slash commands (.md)
- `workflows/` — ~22 workflows (.md)
- `templates/` — Templates para STATE.md, ROADMAP.md, PROJECT.md, etc.
- `references/` — Docs compartilhados (blueprints, UI patterns, git integration)
- `hooks/` — 2 hooks JS (statusline + context monitor)

## Estrutura Duplicada: Root vs up/

O repositorio contem duas copias dos mesmos arquivos:
- **Root level:** `agents/`, `commands/`, `workflows/`, `templates/`, `references/`, `hooks/`, `bin/` — Publicados no npm como pacote `up-cc`
- **`up/` directory:** Copia identica — Representacao do que e instalado em `~/.claude/up/`

O installer copia do root level para o target config dir. A pasta `up/` serve como referencia do layout instalado.
