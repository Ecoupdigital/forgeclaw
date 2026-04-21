# Getting Started

Este guia vai levar voce do zero ate falar com a sua IA no Telegram em ~30 minutos (instalacao) + 10 minutos (primeiro uso). Se preferir video, o [roteiro de 5 minutos](./video-script.md) cobre o mesmo caminho condensado.

## 1. Antes de comecar — pre-requisitos

Voce vai precisar:

- **Uma maquina Linux ou macOS** (Windows funciona via WSL2, mas nao testamos no alpha)
- **Bun 1.1+** instalado — [instalar Bun](https://bun.sh)
- **Claude Code CLI** instalado e autenticado — [instalar claude-code](https://docs.anthropic.com/en/docs/claude-code) (rode `claude login` antes)
- **Um bot do Telegram** criado via [@BotFather](https://t.me/BotFather) (guarde o token)
- **Seu User ID do Telegram** (use [@userinfobot](https://t.me/userinfobot) para descobrir)
- **Acesso ao repo privado** — voce e membro da [comunidade Dominando AutoIA](https://comunidadeautomiaia.com.br) e ja seguiu [ACCESS.md](../ACCESS.md)

**Opcional mas recomendado:**
- **Groq API key** para transcricao de voz (mais rapida e gratis ate 100k req/dia) — [console.groq.com](https://console.groq.com)
- **Obsidian Vault** local (se voce usa) para integrar com contexto do ForgeClaw

Se travou em algum pre-requisito, veja [troubleshooting.md#pre-requisitos](./troubleshooting.md).

![screenshot](./screenshots/01-prerequisitos.png)

## 2. Instalar

Clone e instale:

```bash
git clone https://github.com/Ecoupdigital/forgeclaw.git
cd forgeclaw
bun install
```

Rode o instalador:

```bash
bun run cli install
```

O installer roda em 3 fases:

- **Fase A — tecnica:** detecta Bun, Claude CLI, pdftotext. Pergunta o token do bot, seu Telegram User ID, diretorio de projetos, vault, credenciais de voz (Groq/OpenAI/nenhum), nome/empresa/role.
- **Fase B — arquetipo:** mostra os 5 arquetipos e voce escolhe. Monta `~/.forgeclaw/harness/` com 7 arquivos ja preenchidos com o perfil escolhido.
- **Fase C — handoff:** sobe o dashboard em background, abre o browser em `http://localhost:4040/onboarding?token=...` e imprime a URL caso o browser nao abra sozinho.

![screenshot](./screenshots/02-installer-faseA.png)
![screenshot](./screenshots/03-installer-faseB.png)
![screenshot](./screenshots/04-installer-faseC.png)

Se voce cancelou no meio, rode `bun run cli install --resume` para continuar de onde parou.

Escolha de arquetipo ainda confusa? Leia [archetypes.md](./archetypes.md).

## 3. Onboarding conversacional no dashboard

Apos a Fase C o browser abre na rota `/onboarding`. Ali voce tem:

- **Esquerda:** chat com a Persona Entrevistador ForgeClaw
- **Direita:** preview ao vivo dos arquivos do harness sendo editados

A Persona faz 8-12 perguntas sobre voce e sua rotina. A cada resposta ela edita os arquivos (SOUL, USER, AGENTS, TOOLS, MEMORY, STYLE, HEARTBEAT) em diff estruturado. Voce aprova ou rejeita.

![screenshot](./screenshots/05-onboarding-chat.png)
![screenshot](./screenshots/06-onboarding-diff.png)

Quando terminar, o dashboard cria o sentinel `.onboarded` em `~/.forgeclaw/` e voce e redirecionado para a home.

Se voce quiser reexecutar a entrevista depois (mudou de rotina, trocou de stack), rode:

```bash
bun run cli refine
```

## 4. Subir o bot Telegram

Abra um terminal novo:

```bash
bun run dev:bot
```

Voce deve ver:

```
[bot] ForgeClaw bot started
[bot] Listening for messages from user <seu_id>
```

Se preferir que o bot inicie com o sistema, o installer ja instalou um servico systemd (Linux) ou launchd (macOS) na Fase A. Habilite com:

```bash
sudo systemctl enable --now forgeclaw   # Linux
launchctl load ~/Library/LaunchAgents/com.forgeclaw.bot.plist  # macOS
```

![screenshot](./screenshots/07-bot-rodando.png)

## 5. Primeira mensagem

Abra o Telegram, procure pelo nome do seu bot, e mande `/start`.

Voce deve receber uma resposta do ForgeClaw em alguns segundos. Teste uma pergunta real:

> "Qual e o meu arquetipo?"

A IA ja sabe porque o harness foi preenchido no onboarding.

![screenshot](./screenshots/08-primeiro-hello.png)

## 6. Criar um topic para testar isolamento

No Telegram, voce pode criar **topics** dentro de um super-group (grupo com topics habilitado). Cada topic vira uma sessao isolada com contexto proprio.

Crie 2 topics no mesmo grupo: `financeiro` e `codigo`.

Manda uma mensagem em cada:

- `financeiro`: "Quantas notas fiscais emiti este mes?"
- `codigo`: "Qual stack estou usando no ultimo projeto?"

O ForgeClaw responde em cada um com contexto separado — nao mistura.

![screenshot](./screenshots/09-topics-isolamento.png)

## 7. Seu primeiro cron

Abra o dashboard (`http://localhost:4040`) e va na aba **Automacoes**.

Crie um cron simples:

- **Schedule:** `Todo dia as 23h`
- **Target topic:** `daily-review` (crie esse topic no Telegram antes)
- **Prompt:** `Revise o meu dia olhando os daily logs. Me da os 3 destaques.`

Salve. Amanha as 23h voce recebe a mensagem no topic `daily-review`.

Alternativa: edite `~/.forgeclaw/HEARTBEAT.md` direto. Crons criados no dashboard tem origem `db`. Crons em HEARTBEAT.md tem origem `file`. Ambos convivem. Detalhes em [crons.md](./crons.md).

![screenshot](./screenshots/10-primeiro-cron.png)

## 8. Seu primeiro agente especializado

Ainda no dashboard, va na aba **Agentes** e crie:

- **Nome:** Editor de Copy
- **Prompt:** "Voce e especialista em copy para social media. Toda resposta em portugues brasileiro, tom informal, sem jargao."
- **Memory mode:** Filtrada
- **Tags:** `conteudo, copy, social`

Depois vincule esse agente ao topic `conteudo` do Telegram via dropdown no card do topic.

Agora mensagens naquele topic usam a persona do agente e so veem memorias com as tags indicadas.

![screenshot](./screenshots/11-primeiro-agente.png)

Detalhes completos em [agents.md](./agents.md).

## Proximos passos

- [Conheca as 9 abas do dashboard](./dashboard-tour.md)
- [Aprenda a editar o harness](./harness-guide.md)
- [Veja como criar mais agentes](./agents.md)
- [Experimente webhooks](./dashboard-tour.md#webhooks) (ja suportados, doc completa em breve)

Se travou em qualquer passo: [troubleshooting.md](./troubleshooting.md) e [faq.md](./faq.md).
