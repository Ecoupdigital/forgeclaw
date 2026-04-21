# Estrutura de Canais da Comunidade — ForgeClaw

Este documento e o guia operacional de como os canais da comunidade Dominando AutoIA devem ser organizados pro suporte do ForgeClaw. Serve pra Jonathan e staff (Luan e outros moderadores).

## Canais recomendados

### `#forgeclaw-suporte`

**Publico:** qualquer membro.

**Proposito:** duvidas de uso, configuracao, debug. Primeira linha de suporte.

**Staff:** Jonathan e 1-2 membros experientes. Regra: nenhuma pergunta fica mais que 24h sem resposta.

**Tom:** direto, tecnico mas acessivel. Linkar pra docs quando fizer sentido ("ver [getting-started.md](https://github.com/Ecoupdigital/forgeclaw/blob/main/docs/getting-started.md)").

**Resposta automatica (opcional):** bot da comunidade pode responder no primeiro post do usuario: "bem-vindo, antes de perguntar, confirma que passou pelo #faq-forgeclaw?".

### `#forgeclaw-dev`

**Publico:** membros que querem contribuir codigo, discutir arquitetura, propor features.

**Proposito:** debate de evolucao do produto. NAO e pra suporte basico.

**Staff:** Jonathan.

**Regra:** propostas de feature viram issue no GitHub APOS discussao aqui — pra economizar ruido no repo.

### `#forgeclaw-share`

**Publico:** qualquer membro.

**Proposito:** mostrar sua config, harness, crons, agentes. Inspiracao pros outros.

**Staff:** moderacao leve.

**Formato sugerido:**
- Screenshot da tela relevante (com dados sensiveis mascarados)
- 1 paragrafo do que faz
- Arquivo ou snippet do harness/cron pra quem quiser copiar

## Politica de moderacao

- **Nao toleramos:** compartilhar codigo proprietario de empresa sem autorizacao, dados pessoais de terceiros, tentativas de contornar o gate de acesso.
- **Toleramos:** debate tecnico saudavel, discordancia respeitosa, critica construtiva.
- **Acao quando violado:** aviso no canal > suspensao temporaria > revogacao de acesso ao repo (seguindo fluxo de ACCESS.md).

## Escalacao pra GitHub Issue

Quando uma conversa em `#forgeclaw-suporte` identifica um bug reproduzivel:

1. Staff pergunta "podes abrir issue? Eu linkei o template [aqui]"
2. Usuario abre issue usando bug.md
3. Staff responde no canal com link do issue e fecha a conversa
4. GitHub vira rastro oficial; discussao continua la

Quando uma discussao em `#forgeclaw-dev` amadurece uma feature:

1. Alguem escreve "resumo consolidado" no canal (problema + solucao + alternativas)
2. Staff ou voluntario abre issue de feature usando feature.md
3. Quem discutiu referencia o issue no proximo PR, se vier PR

## Rotinas

- **Semanal (Jonathan):** triagem de issues GitHub, responder PRs pendentes, consolidar insights de `#forgeclaw-dev`
- **Diario (Luan + staff):** garantir que nenhuma pergunta em `#forgeclaw-suporte` ficou mais que 24h sem resposta

## Metricas a observar (alpha da Fase 31)

- Tempo medio de primeira resposta em `#forgeclaw-suporte`
- Numero de issues abertas que poderiam ter sido resolvidas no canal (ruido)
- Taxa de PRs aceitos de membros nao-staff
- Numero de perguntas repetidas — sinaliza doc faltando

## Referencias

- [.github/SUPPORT.md](../.github/SUPPORT.md) — hierarquia de suporte reconhecida pelo GitHub
- [docs/faq.md](./faq.md) — perguntas frequentes
- [docs/troubleshooting.md](./troubleshooting.md) — erros comuns
- [ACCESS.md](../ACCESS.md) — fluxo de concessao e revogacao de acesso
