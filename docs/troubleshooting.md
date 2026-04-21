# Troubleshooting

Lista dos erros mais comuns no ForgeClaw com **sintoma visivel**, **causa** e **solucao passo-a-passo**. Se o seu nao estiver aqui, pergunta no `#forgeclaw-suporte` na [comunidade Dominando AutoIA](https://comunidadeautomiaia.com.br).

## Indice rapido

1. [Pre-requisitos](#pre-requisitos)
2. [Claude CLI nao autenticado](#claude-cli-nao-autenticado)
3. [Bot nao responde no Telegram](#bot-nao-responde-no-telegram)
4. [Usuario nao autorizado](#usuario-nao-autorizado)
5. [Porta 4040 em uso](#porta-4040-em-uso)
6. [Token do dashboard invalido](#token-dashboard-invalido)
7. [Schedule invalido](#schedule-invalido)
8. [Cron nao disparou](#cron-nao-disparou)
9. [Cron output perdido](#cron-output-perdido)
10. [Harness nao atualiza](#harness-nao-atualiza)
11. [Agente nao filtra memoria](#agente-nao-filtra-memoria)
12. [Tom do SOUL ignorado](#tom-do-soul-ignorado)

---

## Pre-requisitos

**Sintoma:** `bun: command not found` ou `claude: command not found` ao rodar o installer.

**Causa:** Bun ou Claude Code CLI nao estao no PATH.

**Solucao:**

```bash
# Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc    # ou ~/.zshrc

# Claude Code CLI (ver docs oficiais)
# Verifica versao minima: Bun >= 1.1
bun --version
claude --version
```

Se `claude` estiver em caminho alternativo (ex: `~/.local/bin/claude`), adicione ao PATH em `~/.bashrc`:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Claude CLI nao autenticado

**Sintoma:** installer trava em "Verificando Claude CLI" ou bot imprime `Error: Please run 'claude login' first`.

**Causa:** voce instalou o claude mas nao autenticou.

**Solucao:**

```bash
claude login
# Segue o fluxo OAuth no browser
claude --version        # confirma que funciona
```

Reinicia o installer com `bun run cli install --resume`.

## Bot nao responde no Telegram

**Sintoma:** voce manda `/start` e nao volta nada.

**Causa possivel 1:** bot nao esta rodando.

**Solucao:** em um terminal:
```bash
bun run dev:bot
```
Ve se aparece `[bot] ForgeClaw bot started`.

**Causa possivel 2:** bot token errado.

**Solucao:** abre `~/.forgeclaw/forgeclaw.config.json` e verifica `botToken`. Compara com o token do [@BotFather](https://t.me/BotFather). Se diferente, corrige e reinicia.

**Causa possivel 3:** servico systemd com env errado.

**Solucao:**
```bash
sudo systemctl status forgeclaw
sudo journalctl -u forgeclaw -n 50
```
Se ver `ENOENT` ou `Permission denied` no arquivo `.env`, o installer nao rodou direito. Rode `bun run cli install --resume`.

## Usuario nao autorizado

**Sintoma:** voce manda mensagem e bot responde `Usuario nao autorizado` (ou simplesmente ignora).

**Causa:** seu User ID do Telegram nao esta em `allowedUsers` do config.

**Solucao:**

1. Descubra seu User ID com [@userinfobot](https://t.me/userinfobot)
2. Abra o dashboard > **Configuracoes** > edite `allowedUsers`
3. Salve. O bot recarrega automaticamente.

Para DMs, `topic_id` e `0`. Para topics de super-group, o topic_id e detectado automaticamente.

## Porta 4040 em uso

**Sintoma:** `Error: listen EADDRINUSE: address already in use 127.0.0.1:4040` ao rodar `dev:dashboard`.

**Causa:** outro processo (provavelmente outra instancia do dashboard) ja esta na porta.

**Solucao:**

```bash
# Descobre quem esta usando
lsof -i :4040 -P -n

# Mata
kill <PID>
```

Alternativa: troca a porta do dashboard (requer alterar `packages/dashboard/package.json` scripts + config do bot).

## Token dashboard invalido

**Sintoma:** pagina `/login` diz "Token invalido" mesmo voce colando o valor certo.

**Causa possivel 1:** voce colou com espacos ou quebras.

**Solucao:** pegue o valor limpo:
```bash
bun run cli token
```
Copie sem espacos.

**Causa possivel 2:** o token foi regenerado por algum motivo e o dashboard esta lendo valor antigo do cookie.

**Solucao:** limpa cookies de `localhost:4040` e faz login de novo.

## Schedule invalido

**Sintoma:** voce salva um cron e vem badge vermelho "Invalid schedule".

**Causa:** parser nao reconhece a expressao.

**Solucao:** verifica se o formato bate com a [tabela de schedules suportados](./crons.md#schedules-suportados). Alguns exemplos invalidos comuns:

- `Todas segundas as 8h` (plural errado — use "Toda segunda")
- `a cada 30 minutos` (minusculo — use "A cada" com A maiusculo OU cron expression `*/30 * * * *`)
- `Todo dia 8h` (falta "as" — use "Todo dia as 8h")

Se nao conseguir escrever em portugues, use cron expression. [crontab.guru](https://crontab.guru) ajuda a montar.

## Cron nao disparou

**Sintoma:** passou do horario e nada aconteceu.

**Diagnostico:**
1. Dashboard > Automacoes > verifica se o job esta `enabled`
2. Verifica o campo `next_run` — se mostra um horario no passado, o CronEngine nao esta rodando
3. Ve os logs: `journalctl -u forgeclaw -n 100 | grep -i cron` (se rodando via systemd)

**Causa comum:** bot caiu sem voce notar e os jobs dependem do processo do bot. Reinicia:

```bash
sudo systemctl restart forgeclaw     # se servico
# ou rode `bun run dev:bot` em terminal
```

**Outra causa:** timezone diferente. Config padrao e `America/Sao_Paulo`. Se voce esta em outro fuso, ajusta em **Configuracoes** > timezone.

## Cron output perdido

**Sintoma:** cron rodou (voce ve no log de automacao) mas nao chegou no Telegram.

**Causa possivel 1:** target_topic_id errado (o topic foi apagado).

**Solucao:** edita o cron no dashboard e ajusta o topic.

**Causa possivel 2:** output muito grande, Telegram rejeitou (limite 4096 chars por mensagem).

**Solucao:** ajusta o prompt pra sair resumido, ou verifica logs do bot pra ver se houve split/erro.

## Harness nao atualiza

**Sintoma:** voce editou `SOUL.md` mas a IA continua respondendo no tom antigo.

**Causa possivel 1:** voce editou o arquivo errado (ex: `packages/core/src/.../SOUL.md` em vez de `~/.forgeclaw/harness/SOUL.md`).

**Solucao:** sempre edite em `~/.forgeclaw/harness/`. O harness do codigo e so template.

**Causa possivel 2:** CLAUDE.md compilado mais novo que o SOUL.md editado (improvavel, mas possivel em filesystem com mtime bugado).

**Solucao:** recompila manualmente:
```bash
bun run cli compile-harness
# Ou simplesmente: touch ~/.forgeclaw/harness/SOUL.md
```

## Agente nao filtra memoria

**Sintoma:** agente com `memory_mode=filtered` e tags `[conteudo]` esta vendo memorias de `financeiro`.

**Causa possivel 1:** as memorias que voce pensa que tem tags nao tem. Auto-memory do ForgeClaw infere tags, mas pode errar.

**Solucao:** dashboard > aba **Memoria** > clica na entry > verifica o campo `entity_name` / tags. Se tiver errado, edita a entry.

**Causa possivel 2:** voce colocou tags com acento ou caixa diferente da que esta salva. Use sempre minusculas, sem acento, hifenizadas: `financeiro`, `copy-social`, `dev`.

## Tom do SOUL ignorado

**Sintoma:** SOUL.md diz "sem emoji" mas a IA usa emoji.

**Causa possivel 1:** voce criou um agente que sobrescreve o tom (ex: agente diz "use emojis para animar"). Lembre-se: o prompt do agente e **prepended**, e modelos Claude tendem a obedecer o ultimo prompt.

**Solucao:** edite o agente e reforce "respeitar o tom do SOUL.md acima" no prompt.

**Causa possivel 2:** STYLE.md contradiz SOUL.md.

**Solucao:** alinhe os dois arquivos. Voce pode ver o CLAUDE.md compilado em `~/.forgeclaw/CLAUDE.md` pra debugar.

---

## Nao resolveu?

- [faq.md](./faq.md) — perguntas frequentes
- `#forgeclaw-suporte` na [comunidade Dominando AutoIA](https://comunidadeautomiaia.com.br)
- Issue no repo privado (segundo nivel, apos passar pelo canal da comunidade)
