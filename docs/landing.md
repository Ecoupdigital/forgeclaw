# ForgeClaw

**Seu comando central de IA pessoal, conectado ao Claude Code.**

Voce fala no Telegram. O Claude trabalha na sua maquina. Tudo em tempo real, com memoria persistente, agentes especializados, tarefas agendadas e um dashboard web que voce controla.

---

## Para quem e

ForgeClaw e pra voce que:

- Ja usa Claude Code CLI (ou quer usar) e se incomoda em estar preso ao terminal
- Quer sua IA trabalhando pra voce enquanto voce vive a vida — literalmente
- Prefere construir o proprio stack em vez de pagar R$ 200/mes em SaaS que faz menos
- Tem uma assinatura Claude (Max ou API) e quer aproveitar cada credito

## Para quem nao e

- Quem nao tem terminal instalado ou nunca rodou um comando `git clone` na vida
- Quem quer um produto plug-and-play igual ChatGPT app (ForgeClaw mora na sua maquina, voce que administra)
- Quem precisa de suporte corporativo / SSO / multi-usuario (ainda nao existe aqui)

## O que tem dentro

| Area | Resumo |
|------|--------|
| **Bot Telegram** | Topics viram sessoes isoladas. Cada topic com seu contexto, sua memoria, seu agente. |
| **Dashboard web** | Local na sua maquina. 9 abas cobrindo chat, sessoes, crons, memoria, agentes, tokens, atividade, webhooks, personalidade. |
| **Harness de personalidade** | 6 arquivos Markdown que definem quem e sua IA. Voce edita em linguagem natural. |
| **Agentes especializados** | Um agente de codigo, um de copy, um financeiro. Cada topic escolhe o seu. Memoria pode ser global, filtrada por tags ou zero. |
| **Crons em portugues** | `Todo dia as 23h -> topico Daily Review`. Escreve no arquivo HEARTBEAT.md e roda. |
| **Voz e arquivos** | Manda audio, PDF, imagem ou ZIP. Tudo entra no contexto. |
| **Webhooks** | HMAC-SHA256, retry com backoff. Conecta em qualquer sistema. |

## Tecnologia honesta

Bun + TypeScript no motor. Next.js 16 + React 19 no dashboard. SQLite com WAL como banco. grammy como lib do Telegram. Claude Code CLI como cerebro. Tudo monorepo, 4 packages (`core`, `bot`, `dashboard`, `cli`).

Sua maquina faz todo o trabalho pesado. Voce precisa de Bun 1.1+, Claude Code CLI autenticado e um bot criado no [@BotFather](https://t.me/BotFather).

## Como conseguir

ForgeClaw nao esta a venda avulso. Ele e um beneficio da comunidade **Dominando AutoIA**, que e onde o suporte acontece, a galera compartilha config, e onde novas versoes sao anunciadas.

Quer saber mais sobre a comunidade? Leia em [comunidadeautomiaia.com.br](https://comunidadeautomiaia.com.br).

Ja e membro e quer seu acesso? Veja [ACCESS.md](../ACCESS.md) e abra ticket no canal `#forgeclaw-suporte`.

## Construido por

Jonathan Renan Outeiro, fundador da [EcoUp Digital](https://ecoup.digital). Builder solitario, ensina IA aplicada em [@jonathanrenan.ia](https://instagram.com/jonathanrenan.ia).

---

_Este arquivo e uma landing estatica. A documentacao completa esta em [README.md](../README.md) (para membros com acesso ao repo)._
