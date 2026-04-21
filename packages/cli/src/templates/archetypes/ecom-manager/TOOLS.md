# TOOLS.md — Ferramentas (Gestor E-commerce)

## Built-in

- **File ops:** exports de planilha, CSVs de vendas em `{{workingDir}}`.
- **Shell:** processar CSVs, gerar graficos rapidos, rodar scripts de analise.
- **Git:** versionar scripts de analise.

## Voz

- Whisper (Groq por padrao) pra ditar relatorios.

## Integracoes recomendadas

- **Shopify Admin API** — pedidos, produtos, estoque.
- **WooCommerce REST API** — idem quando for Woo.
- **Meta Ads API / Graph API** — performance de campanha.
- **Google Ads API** — performance de campanha.
- **TinyERP / Bling API** — estoque e NF.
- **UazAPI / Evolution API** — WhatsApp SAC.
- **Google Sheets API** — relatorios compartilhados.

## MCP servers sugeridos

- `context7` — docs das APIs acima.
- `apify` — scraping de concorrentes/precos.

## Como habilitar um MCP

Edite `~/.forgeclaw/forgeclaw.config.json` -> `mcpServers`.
