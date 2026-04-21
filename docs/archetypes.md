# Arquetipos

O ForgeClaw vem com 5 arquetipos prontos. Cada um monta seu harness (SOUL, USER, AGENTS, TOOLS, MEMORY, STYLE, HEARTBEAT) com valores padrao diferentes — tom, agentes sugeridos, ferramentas recomendadas, crons iniciais.

Voce escolhe **um** no install. Se escolher errado, roda `forgeclaw refine` depois e troca, sem reinstalar.

![screenshot](./screenshots/archetype-picker.png)

## Qual escolher?

| Se voce... | Escolha |
|-----------|---------|
| Constroi produtos sozinho, poucos clientes, muita execucao tecnica | [Solo Builder](#solo-builder) |
| Vive de social media, carrosseis, reels, editorial | [Criador de Conteudo](#criador-de-conteudo) |
| Tem multiplos clientes, precisa de relatorio semanal e cobranca | [Agencia / Freela](#agencia--freela) |
| Toca Shopify/Woo/E-commerce com ads, estoque e SAC | [Gestor E-commerce](#gestor-e-commerce) |
| Nao se encaixa em nenhum acima ou quer comecar neutro | [Generico](#generico) |

---

## Solo Builder

**Quem e:** dev indie que constroi produtos pessoais usando Claude Code. Poucos clientes, muita execucao tecnica. Ciclo curto de vibecoding.

**Agentes sugeridos:**

| Agente | Papel |
|--------|-------|
| Code Agent | Escreve, revisa, debuga e refatora codigo. Conhece a stack do projeto atual. |
| Shipper | Foco em deploy, releases, changelog. Sugere cortes pra embarcar mais rapido. |
| Ideia Lab | Brainstorm de produtos, validacao rapida, positioning. |

**Ferramentas recomendadas:** GitHub CLI, Shell (Bun/Node/Python), Obsidian (vault local), Docker/Compose, Coolify ou Vercel, Context7 MCP.

**Escolha esse se** voce mexe em codigo todo dia, tem 1-3 projetos pessoais em paralelo, e prefere shipar rapido que documentar muito.

![screenshot](./screenshots/archetype-solo-builder.png)

## Criador de Conteudo

**Quem e:** foca em social media, editorial, reels, carrosseis, SEO. Trabalha sozinho ou com um editor.

**Agentes sugeridos:**

| Agente | Papel |
|--------|-------|
| Editor de Carrossel | Gera roteiros de carrossel Instagram/LinkedIn, hooks, CTAs. |
| Roteirista de Reels | Hooks em 3s, estrutura problema-solucao-CTA, sugestao de trilha. |
| Editor SEO | Reescreve posts longos com foco em SEO, meta description, H2. |
| Editorial Planner | Planeja calendario semanal, sugere temas por pilar. |

**Ferramentas recomendadas:** Instagram scraping MCP (pra refs), fal.ai (imagens/video), ElevenLabs (TTS), Notion/Obsidian (editorial), Buffer ou Metricool (scheduling).

**Escolha esse se** voce posta mais que 3x por semana em alguma rede, seu trabalho e atencao, e voce ja tem calendario editorial (mesmo que bagunca).

![screenshot](./screenshots/archetype-content-creator.png)

## Agencia / Freela

**Quem e:** multiplos clientes simultaneos, processos repetiveis, relatorios semanais e financeiro basico.

**Agentes sugeridos:**

| Agente | Papel |
|--------|-------|
| Gestor de Clientes | Acompanha status de cada cliente, relatorios semanais, pendencias. |
| Comercial | Propostas, escopo, negociacao. NAO faz follow-up automatico sem aprovar. |
| Financeiro | Cobranca, NFS-e, recebiveis. Integra com Asaas/Conta Azul quando configurado. |
| Projetos | Roadmaps e planos por cliente, milestones, bloqueios. |

**Ferramentas recomendadas:** Asaas MCP, GitHub CLI por cliente, Obsidian (pasta por cliente), Notion/ClickUp, Google Drive, WhatsApp via UazAPI.

**Escolha esse se** voce entrega mesmo tipo de trabalho repetidamente pra clientes diferentes e perde tempo com status updates.

![screenshot](./screenshots/archetype-agency-freela.png)

## Gestor E-commerce

**Quem e:** gerencia loja Shopify/Woo. Estoque, vendas, anuncios, atendimento. Pensa em ROAS e conversao diario.

**Agentes sugeridos:**

| Agente | Papel |
|--------|-------|
| Analista de Vendas | Monitora vendas diarias, margem, top SKUs, alerta queda. |
| Ads Manager | Meta/Google, CPA, ROAS, sugere pausas e escala. |
| Estoque | Alerta estoque baixo, sugestao de reposicao baseada em giro. |
| SAC | Duvidas comuns, rastreio, trocas. Escala humanos quando foge do script. |

**Ferramentas recomendadas:** Shopify Admin API, Meta Ads API, Google Ads API, TinyERP/Bling, UazAPI (WhatsApp SAC), Google Sheets.

**Escolha esse se** voce olha dashboard de ads e vendas todo dia e precisa de alertas proativos em estoque/conversao.

![screenshot](./screenshots/archetype-ecom-manager.png)

## Generico

**Quem e:** fallback neutro. Util quando voce nao se encaixa nos outros 4 ou quando esta testando.

**Agentes sugeridos:**

| Agente | Papel |
|--------|-------|
| General Assistant | Ajudante padrao. Sem persona forte. |
| Task Runner | Executa comandos, le arquivos, pesquisa. Minimo de personalidade. |

**Ferramentas recomendadas:** Shell, Obsidian (opcional), GitHub CLI (opcional).

**Escolha esse se** voce quer experimentar o ForgeClaw antes de se comprometer com uma persona especifica.

![screenshot](./screenshots/archetype-generic.png)

---

## Trocar de arquetipo

Duas opcoes:

1. **Refine** (mais simples): `bun run cli refine` — a Persona Entrevistadora roda de novo, desta vez sabendo seu uso atual, e voce pode mudar o arquetipo ali.
2. **Install de novo** (resetao): `bun run cli install --archetype <novo-slug>`. Sobrescreve os arquivos de harness mas preserva config e banco.

Detalhes do harness em [harness-guide.md](./harness-guide.md).
