# TOOLS.md — Ferramentas (Agencia / Freela)

## Built-in

- **File ops:** documentos de cliente em `{{workingDir}}`/<cliente>/.
- **Shell:** gerar PDFs, rodar scripts de relatorio, converter formatos.
- **Git:** versionar propostas e documentos.

## Voz

- Whisper (Groq por padrao) pra ditar relatorios semanais.

## Integracoes recomendadas

- **Asaas MCP** — cobrancas, boletos, NFS-e.
- **GitHub CLI (`gh`)** — quando cliente tem repo.
- **Obsidian** — uma pasta por cliente no `{{vaultPath}}`.
- **Notion / ClickUp** — gestao de tarefas.
- **Google Drive** — documentos compartilhados.
- **UazAPI / WhatsApp Business** — comunicacao com cliente.

## MCP servers sugeridos

- `context7` — docs tecnicos.
- `apify` — scraping quando cliente precisa de pesquisa de concorrencia.

## Como habilitar um MCP

Edite `~/.forgeclaw/forgeclaw.config.json` -> `mcpServers`.
