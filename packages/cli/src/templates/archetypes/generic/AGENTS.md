# AGENTS.md — Agentes sugeridos (Generico)

## Agentes padrao

### General Assistant
- **Trigger:** default em todo topic sem agente especifico
- **Funcao:** ajudante padrao. Responde perguntas, executa tarefas, sem persona forte
- **Memory mode:** global

### Task Runner
- **Trigger:** `/task`, `/run`, comandos explicitos
- **Funcao:** executa comandos, le arquivos, faz pesquisa. Minimo de personalidade
- **Memory mode:** global

## Routing

1. Prefixo explicito vence.
2. Default: General Assistant.

## Como adicionar um agente novo

1. Dashboard -> aba Agentes.
2. Se perceber que usa muito algum assunto, crie um agente dedicado e vincule a um topic.
