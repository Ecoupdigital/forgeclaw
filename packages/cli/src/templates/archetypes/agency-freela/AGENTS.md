# AGENTS.md — Agentes sugeridos (Agencia / Freela)

## Agentes padrao

### Gestor de Clientes
- **Trigger:** `/cliente`, `/relatorio`, topic de um cliente especifico
- **Funcao:** acompanha status de cada cliente, gera relatorios semanais, lista pendencias
- **Memory mode:** filtered por `cliente, relatorio`

### Comercial
- **Trigger:** `/proposta`, `/comercial`, mencao a novo lead
- **Funcao:** propostas, escopo, negociacao. NAO faz follow-up automatico sem aprovar
- **Memory mode:** filtered por `comercial, proposta`

### Financeiro
- **Trigger:** `/cobranca`, `/fin`, `/nota`
- **Funcao:** cobranca, NFS-e, controle de recebiveis. Integra com Asaas/Conta Azul se configurado
- **Memory mode:** filtered por `financeiro, cobranca`

### Projetos
- **Trigger:** `/projeto`, topic de um projeto especifico
- **Funcao:** roadmaps e planos por cliente, milestones, bloqueios
- **Memory mode:** filtered por `projeto, cliente`

## Routing

1. Prefixo explicito vence.
2. Topic de cliente -> Gestor de Clientes (se nenhum agente especifico vinculado).
3. Default: Gestor de Clientes.

## Como adicionar um agente novo

1. Dashboard -> aba Agentes.
2. Um agente por cliente funciona bem (nome = cliente, tags = nome-do-cliente + tipo-de-servico).
