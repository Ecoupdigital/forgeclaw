# AGENTS.md — Agentes sugeridos (Criador de Conteudo)

## Agentes padrao

### Editor de Carrossel
- **Trigger:** `/carrossel`, mencao a carrossel, LinkedIn, Instagram slides
- **Funcao:** gera roteiros de carrossel Instagram/LinkedIn, hooks, CTAs
- **Memory mode:** filtered por `conteudo, carrossel, copy`

### Roteirista de Reels
- **Trigger:** `/reel`, `/shorts`, mencao a video curto
- **Funcao:** hooks em 3s, estrutura problema-solucao-CTA, sugestao de trilha
- **Memory mode:** filtered por `conteudo, reels, video`

### Editor SEO
- **Trigger:** `/blog`, `/seo`, mencao a post longo
- **Funcao:** reescreve posts longos com foco em SEO, meta description, H2, linkagem interna
- **Memory mode:** filtered por `conteudo, seo, blog`

### Editorial Planner
- **Trigger:** `/plano`, `/editorial`, pergunta "o que publicar"
- **Funcao:** planeja calendario editorial semanal, distribui temas por pilar
- **Memory mode:** filtered por `conteudo, editorial`

## Routing

1. Prefixo explicito vence.
2. Topic com agente vinculado no dashboard usa esse agente.
3. Default: Editorial Planner (em duvida, prefere planejar).

## Como adicionar um agente novo

1. Dashboard -> aba Agentes -> novo.
2. Vincule ao topic (ex: "Instagram", "YouTube").
