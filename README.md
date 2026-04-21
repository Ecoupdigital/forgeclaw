# ForgeClaw

Seu comando central de IA pessoal, conectado ao Claude Code.

Voce fala no Telegram, o Claude responde do seu computador. Um dashboard web mostra tudo que ele esta fazendo em tempo real. E quando voce dorme, ele continua rodando tarefas agendadas que voce mesmo criou.

ForgeClaw e o produto de acesso exclusivo da comunidade [Dominando AutoIA](https://comunidadeautomiaia.com.br). Nao esta a venda separadamente.

## Por que voce vai usar

- **Fala com sua IA de qualquer lugar.** Mandou uma mensagem no Telegram do onibus? O Claude ja esta mexendo no seu projeto quando voce chegar em casa.
- **Ela lembra de voce.** Daily logs automaticos, memoria de longo prazo, contexto do seu trabalho. Voce nao precisa reexplicar quem voce e toda conversa.
- **Voce tem agentes especialistas.** Um para codigo, um para copy, um para financeiro. Cada topic do Telegram com sua persona. Sem mistura.
- **Ela trabalha sozinha.** Crons em portugues ("todo dia as 23h faca daily review") que rodam no horario, buscam contexto e te respondem no topic certo.
- **Tudo seu, na sua maquina.** Zero custo de API — roda com sua assinatura Claude. Seus dados ficam no seu disco.

## Quick Start (4 passos)

1. **Receba seu acesso.** Voce entra no canal da comunidade e pede no #forgeclaw-suporte. Entra em 24h. [Como obter acesso](ACCESS.md).
2. **Instale em 5 minutos.** Abra o terminal e rode:
   ```bash
   git clone https://github.com/Ecoupdigital/forgeclaw.git
   cd forgeclaw
   bun install
   bun run cli install
   ```
   O instalador pergunta tudo que precisa: qual arquetipo voce e (Solo Builder, Criador, Agencia, E-commerce, Generico), token do bot Telegram, dados da sua stack.
3. **Conecte seu bot.** O instalador abre o browser na tela de onboarding. Voce conversa com o ForgeClaw respondendo umas perguntas e ele monta a personalidade (harness) sozinho.
4. **Fale com ele.** Abre o Telegram, procura pelo seu bot, manda a primeira mensagem. Pronto.

[Veja o walkthrough em video de 5 min](docs/video-script.md) (roteiro; video gravado apos o alpha).

[Guia completo com screenshots](docs/getting-started.md)

## O que voce recebe

| O que | Para que |
|-------|----------|
| **Bot Telegram** | Fala com o Claude de qualquer lugar. Topics viram sessoes isoladas (financeiro, codigo, conteudo). |
| **Dashboard web** | 9 abas: chat, sessoes, crons, memoria, agentes, tokens, atividade, webhooks, personalidade. Roda local, so voce acessa. |
| **5 arquetipos prontos** | Solo Builder, Criador de Conteudo, Agencia/Freela, Gestor E-commerce, Generico. Escolhe no install, harness ja vem configurado. |
| **Agentes especializados** | Cada topic pode ter um agente com prompt proprio e memoria filtrada por tags. |
| **Crons em portugues** | "Toda segunda as 8h -> topico Weekly Planning" no arquivo HEARTBEAT.md. Hot reload, roda sem restart. |
| **Memoria persistente** | Daily logs + consolidacao automatica em MEMORY.md. Busca FTS5 no dashboard. |
| **Voz** | Manda audio no Telegram, vira texto (Whisper Groq ou OpenAI), Claude responde. |
| **Arquivos** | PDF, imagem, ZIP — tudo entra no contexto. Arquivos gerados voltam pra voce no chat. |
| **Webhooks** | HMAC-SHA256, retry com backoff. Conecta em qualquer sistema externo. |

## Tech stack (rapido)

Se voce quer saber o que esta rodando na sua maquina: Bun + TypeScript no motor, grammy no bot Telegram, Next.js 16 + React 19 + Tailwind 4 no dashboard, SQLite (bun:sqlite + WAL) no banco, Claude Code CLI no cerebro. Tudo monorepo, 4 packages: `core`, `bot`, `dashboard`, `cli`.

Voce nao precisa saber nada disso para usar. E se quiser modificar, o codigo esta todo comentado.

## Comandos que voce vai usar

No Telegram:

| Comando | O que faz |
|---------|-----------|
| `/start` | Inicializa sessao e mostra ajuda |
| `/new` | Abre sessao nova (limpa contexto) |
| `/stop` | Aborta a tarefa em execucao |
| `/status` | Mostra fila, contexto usado |
| `/project` | Troca o projeto em que o Claude esta trabalhando |
| `!` (prefixo) | Interrompe a resposta atual e manda um prompt novo |

No terminal:

| Comando | O que faz |
|---------|-----------|
| `forgeclaw install` | Instalador em 3 fases (tecnica + arquetipo + handoff pro dashboard) |
| `forgeclaw refine` | Reexecuta a entrevista para ajustar o harness sem reinstalar |
| `forgeclaw status` | Status de todos os componentes |
| `forgeclaw logs` | Tail em tempo real do log do bot |
| `forgeclaw export` | Gera .tar.gz com db + config + harness + memory (backup) |
| `forgeclaw uninstall` | Remove tudo (com confirmacao dupla) |

## Documentacao completa

Para cada pergunta voce tem um documento dedicado em [docs/](docs/):

| Se voce quer | Leia |
|--------------|------|
| Instalar passo-a-passo com imagens | [docs/getting-started.md](docs/getting-started.md) |
| Entender qual arquetipo escolher | [docs/archetypes.md](docs/archetypes.md) |
| Conhecer as 9 abas do dashboard | [docs/dashboard-tour.md](docs/dashboard-tour.md) |
| Editar o harness (personalidade da sua IA) | [docs/harness-guide.md](docs/harness-guide.md) |
| Criar agentes especializados | [docs/agents.md](docs/agents.md) |
| Criar tarefas agendadas | [docs/crons.md](docs/crons.md) |
| Resolver um erro | [docs/troubleshooting.md](docs/troubleshooting.md) |
| Perguntas frequentes | [docs/faq.md](docs/faq.md) |

## Suporte

- **Duvida ou bug?** Pergunta no canal `#forgeclaw-suporte` da [comunidade Dominando AutoIA](https://comunidadeautomiaia.com.br). Voce vai ter resposta rapida e direta.
- **Issues no GitHub?** Use so pra reportar bugs ja confirmados (o canal da comunidade e o caminho primario; issues sao acompanhados como segundo nivel).
- **Acesso suspenso ou problemas de billing?** Fale no mesmo canal da comunidade.

## License

Ver arquivo [LICENSE](LICENSE). ForgeClaw Community Source License v1.0 — uso individual autorizado, sem redistribuicao ou revenda.

---

_ForgeClaw e um produto exclusivo da [comunidade Dominando AutoIA](https://comunidadeautomiaia.com.br). Construido por [Jonathan Renan](https://instagram.com/jonathanrenan.ia) / EcoUp Digital._
