# TOOLS.md — Ferramentas (Criador de Conteudo)

## Built-in

- **File ops:** drafts em `{{workingDir}}`, read/write/edit.
- **Shell:** processar midia, converter formato, mover arquivos.
- **Git:** versionar rascunhos se quiser.

## Voz

- Transcricao via Whisper (Groq por padrao). Util pra ditar roteiros.

## Integracoes recomendadas

- **Instagram scraping MCP** — coletar referencias de posts.
- **fal.ai** — geracao de imagens e video curto.
- **ElevenLabs** — voz TTS pra narracao de reels.
- **Notion / Obsidian** — calendario editorial e vault.
- **Buffer / Metricool** — agendar publicacao (sem API oficial integrada por padrao).

## MCP servers sugeridos

- `context7` — docs se for fazer algo tecnico pontual.
- `apify` — scraping de social media.

## Como habilitar um MCP

Edite `~/.forgeclaw/forgeclaw.config.json` -> `mcpServers`.
