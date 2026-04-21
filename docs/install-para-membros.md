# Instalacao do ForgeClaw — Guia pro membro da comunidade

> **Cole este guia na plataforma da comunidade** (ou adapte pra postagem no Telegram/Discord). Link pro video walkthrough ao final.

O ForgeClaw transforma o Claude Code num assistente pessoal que responde no Telegram e mostra tudo num dashboard web. Zero custo de API — roda com a sua assinatura Claude Max.

Em 5 minutos voce vai ter bot rodando. Segue os passos na ordem.

---

## Pre-requisitos (checa antes de comecar)

Abra o terminal e rode:

```bash
bun --version      # precisa ser >= 1.1
claude --version   # precisa responder (se nao, instala: npm install -g @anthropic-ai/claude-code)
claude --print hi  # precisa estar autenticado (se nao, rode: claude login)
```

Se algum falhou:

- **Bun faltando** → https://bun.sh/install (Mac: `curl -fsSL https://bun.sh/install | bash`)
- **Claude faltando** → `npm install -g @anthropic-ai/claude-code`
- **Claude nao autenticado** → `claude login`, faz o fluxo no browser

Alem disso voce precisa de:

- **Bot Telegram criado** → Abre o Telegram, fala com [@BotFather](https://t.me/BotFather), manda `/newbot`, escolhe nome, copia o **token** (parece `123456:ABC-DEF...`).
- **Seu Telegram user ID** → Fala com [@userinfobot](https://t.me/userinfobot), ele te manda um numero (ex: `123456789`). Guarda esse numero.

---

## Instalacao

Um comando:

```bash
npx forgeclaw install
```

O wizard vai te guiar em 3 fases:

### Fase A — Tecnica (1 min)

Valida deps, pede credenciais:

- **Token do bot Telegram** — aquele do BotFather
- **Seu user ID do Telegram** — aquele do userinfobot
- **Voice provider** — Groq (recomendado, rapido) ou OpenAI. Ou `none` se nao usa voz.
- **Working directory** — pasta onde o Claude vai trabalhar (ex: `~/projects`)
- **Vault Obsidian** (opcional) — se voce usa Obsidian, aponta o path do vault pra ele ler suas notas como contexto

### Fase B — Escolha de arquetipo (30 seg)

5 opcoes:

| Arquetipo | Pra quem |
|-----------|----------|
| **Solo Builder** | Dev indie, vibecoding com Claude Code, projetos pessoais |
| **Criador de Conteudo** | Foco em social media, editorial, reels, carrosseis, SEO |
| **Agencia/Freela** | Multiplos clientes, processos repetiveis, relatorios |
| **Gestor E-commerce** | Shopify/Woo, estoque, vendas, anuncios, atendimento |
| **Generico** | Fallback neutro, personalize depois via `forgeclaw refine` |

Escolhe. O ForgeClaw popula `~/.forgeclaw/` com harness customizado pro teu perfil.

### Fase C — Onboarding conversacional (2-3 min, opcional)

O browser abre automaticamente em `http://localhost:4040/onboarding`. Voce conversa com o entrevistador (chat a esquerda, preview do teu harness sendo construido a direita em tempo real).

Responde o que te perguntarem. No final, clica **Aprovar e salvar** — ou **Pular** se quer usar o template puro.

> Se preferir pular agora e refinar depois, pode. Roda `npx forgeclaw refine` quando quiser.

---

## Primeira mensagem

Abre o Telegram, busca o nome do seu bot, manda `/start`. Ele responde.

Manda a primeira tarefa real:

```
oi, cria uma pasta chamada "testforgeclaw" dentro de ~/projects e gera um README.md com uma ideia de side project pra eu construir esse fim de semana
```

Vai responder em streaming. A pasta vai aparecer na tua maquina.

---

## Dashboard

Enquanto o bot roda, abre `http://localhost:4040` no browser. 9 abas:

| Aba | O que tem |
|-----|-----------|
| **Sessoes** | Chat live com cada topic, streaming, historico |
| **Automacoes** | Criar/editar crons (tarefas agendadas) |
| **Memoria** | Busca FTS5 nas memorias + audit trail |
| **Agentes** | CRUD de agentes especializados por topic |
| **Tokens** | Uso diario, top sessoes, cache vs fresh |
| **Atividade** | Feed cronologico de eventos do sistema |
| **Webhooks** | Notificacoes HMAC-SHA256 outbound |
| **Configuracoes** | Bot, allowedUsers, etc |
| **Personalidade** | Editor dos arquivos do harness |

---

## Rodar em background (producao)

O instalador ja configurou `systemd` (Linux) ou `launchd` (macOS). Pra ativar no boot:

```bash
# Linux
systemctl --user enable --now forgeclaw-bot forgeclaw-dashboard

# macOS
launchctl load ~/Library/LaunchAgents/com.forgeclaw.bot.plist
launchctl load ~/Library/LaunchAgents/com.forgeclaw.dashboard.plist
```

---

## Problemas comuns

**Claude CLI trava no install → `claude login` faltando.** Roda `claude login`, depois `npx forgeclaw install --resume`.

**Bot Telegram nao responde → usuario nao autorizado.** O wizard pede `allowedUsers` na Fase A. Se voce esqueceu seu ID, edita `~/.forgeclaw/forgeclaw.config.json` direto.

**Dashboard pede token e voce esqueceu.** Roda `forgeclaw token` no terminal. Ou abre `~/.forgeclaw/forgeclaw.config.json` e copia `dashboardToken`.

**Quer mudar de arquetipo depois.** Roda `npx forgeclaw refine --archetype=<novo>`. Backup automatico do harness atual antes.

Mais erros e solucoes em [docs/troubleshooting.md](./troubleshooting.md).

---

## Recursos extras da comunidade

- **Biblioteca de harness por nicho** (alem dos 5 arquetipos padrao) — canal `#forgeclaw-harness`
- **Biblioteca de agentes prontos** — canal `#forgeclaw-agentes`
- **Biblioteca de crons testados** — canal `#forgeclaw-crons`
- **Suporte ao vivo** — canal `#forgeclaw-suporte`
- **Trilha de aulas Claude Code + ForgeClaw** — pasta `cursos/`

---

## Proximos passos

- [docs/getting-started.md](./getting-started.md) — tutorial completo (40-60 min leitura)
- [docs/archetypes.md](./archetypes.md) — deep dive em cada arquetipo
- [docs/dashboard-tour.md](./dashboard-tour.md) — as 9 abas em detalhe
- [docs/video-script.md](./video-script.md) — roteiro do walkthrough (video gravado apos o alpha)
