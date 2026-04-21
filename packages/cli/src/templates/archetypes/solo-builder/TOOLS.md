# TOOLS.md — Ferramentas (Solo Builder)

## Built-in

- **Shell:** comandos em `{{workingDir}}`, saida capturada.
- **File ops:** read, write, edit, glob, grep.
- **Git:** status, diff, log, commit, branch; PRs via `gh` CLI.
- **Build:** npm/bun/pnpm scripts, pytest, cargo, go test.

## Voz

- Transcricao via Whisper (Groq por padrao, OpenAI opcional).

## Integracoes recomendadas

- **GitHub CLI (`gh`)** — gerenciar repos, PRs, issues.
- **Docker / Docker Compose** — subir servicos locais.
- **Coolify ou Vercel** — deploy de apps.
- **Obsidian vault local** — segundo cerebro em `{{vaultPath}}`.
- **Context7 MCP** — docs oficiais de bibliotecas.

## MCP servers sugeridos

- `context7` — docs atualizados.
- `github` — busca e manipulacao de repos.
- `playwright` (opcional) — automacao de browser pra QA.

## Como habilitar um MCP

Edite `~/.forgeclaw/forgeclaw.config.json` -> `mcpServers`.
