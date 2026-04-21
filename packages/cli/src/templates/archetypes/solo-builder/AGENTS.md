# AGENTS.md — Agentes sugeridos (Solo Builder)

## Agentes padrao

### Code Agent
- **Trigger:** default em topicos tecnicos, comandos `/code`
- **Funcao:** escreve, revisa, debuga e refatora codigo respeitando a stack do projeto atual
- **Memory mode:** filtered por `dev, code`

### Shipper
- **Trigger:** topicos de release, comandos `/ship`, `/release`
- **Funcao:** prepara deploy, changelog, commit message, sugere cortes pra embarcar
- **Memory mode:** filtered por `dev, ship, deploy`

### Ideia Lab
- **Trigger:** conversas sobre novos produtos, positioning, validacao
- **Funcao:** brainstorm, checklist de validacao, rascunho de landing
- **Memory mode:** filtered por `produto, ideacao`

## Routing

1. Prefixo explicito (`/code`, `/ship`) ganha prioridade.
2. Topic com agente vinculado no dashboard usa esse agente.
3. Default: Code Agent.

## Como adicionar um agente novo

1. Abra o dashboard (`localhost:4040`) -> aba Agentes.
2. Crie com nome, prompt e memory mode.
3. Vincule ao topic desejado pelo sidebar.
