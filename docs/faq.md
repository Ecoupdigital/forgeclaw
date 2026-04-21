# FAQ

Perguntas frequentes de membros da comunidade. Se a sua nao esta aqui, pergunta no `#forgeclaw-suporte` na [comunidade Dominando AutoIA](https://comunidadeautomiaia.com.br).

## 1. Preciso pagar alguma coisa alem da comunidade?

Nao de obrigatorio. O ForgeClaw roda com sua assinatura Claude (se voce ja tem Claude Max, nao paga nada extra de API). Voz via Groq tem free tier (100k req/dia). Se voce preferir OpenAI Whisper, ai sim tem custo por minuto.

## 2. Funciona no Windows?

Via WSL2 sim, direto no Windows nao testamos no alpha. Recomendamos Linux (Ubuntu 22+) ou macOS.

## 3. Vou precisar de VPS?

Nao. Roda na sua maquina local. Se quiser deixar online 24/7 (pra cron nao depender do laptop ligado), ai sim uma VPS pequena (Hetzner CX11, R$ 15/mes) resolve.

## 4. O Claude nao vai estourar meu limite de tokens?

Depende do uso. O dashboard tem aba **Tokens** pra voce monitorar. Se estourar Claude Max, o bot informa no Telegram e voce pode pausar. Cache de contexto esta ligado por padrao — economiza muito.

## 5. Meus dados vao pra Anthropic?

Os prompts que voce manda pro Claude vao, sim — e como usar o Claude diretamente. O que fica na sua maquina e o **historico** (sessoes, mensagens, memoria, arquivos), o bot, o dashboard. Anthropic so ve o que voce explicitamente enviar como prompt.

## 6. Posso usar outro modelo (GPT-4, Gemini)?

Nao por enquanto. O motor do ForgeClaw e o **Claude Code CLI** especificamente, pra aproveitar streaming de tools, sessoes persistentes e Claude Max. Ha suporte experimental a Codex como runtime alternativo.

## 7. Posso revender ou dar acesso pra amigo?

Nao, segundo a [LICENSE](../LICENSE). O ForgeClaw e de uso individual, vinculado a sua assinatura da comunidade. Se seu amigo quer usar, ele assina a comunidade.

## 8. Meu bot sumiu/nao esta listado no Telegram

Procure pelo **nome de usuario** do bot (`@NomeDoBot`) que voce definiu no BotFather, nao pelo nome de exibicao. Se nao lembra, abre o BotFather e vai em `/mybots`.

## 9. Como faco backup?

Comando: `bun run cli export` — gera um .tar.gz com banco + config + harness + memory. Guarde em lugar seguro. Para restaurar, voce extrai manualmente pra `~/.forgeclaw/` e roda `bun run cli install --update`.

## 10. Posso ter multiplos bots pra separar contextos?

Hoje, um ForgeClaw = um bot. Mas um bot tem topics (super-group) ou chats individuais — e cada topic/chat tem sessao isolada + agente diferente. Isso geralmente resolve o que voce queria com multiplos bots.

## 11. O que acontece se eu mudar de maquina?

Copia `~/.forgeclaw/` inteiro pra maquina nova, reinstala dependencias (`bun install`), roda `bun run cli install --update` (preserva config existente).

## 12. Meu acesso ao repo pode ser revogado?

Sim, se voce cancelar a assinatura da comunidade. O repo privado e o gate. Voce continua com sua copia local funcionando (codigo ja clonado), mas nao recebe updates futuros.

## 13. Como eu atualizo?

Comando: `git pull` na pasta do clone + `bun install` + `bun run cli install --update`. Isso preserva seu config, mas pode sobrescrever arquivos de harness se tiver versao mais nova do arquetipo — se voce customizou muito o harness, faz backup antes (ver pergunta 9).

## 14. O harness e publico? Alguem ve meu USER.md?

Nao. Todo o harness mora em `~/.forgeclaw/harness/` na sua maquina. Ninguem alem de voce tem acesso. O repo privado do GitHub tem so codigo, nao dados.

## 15. Posso contribuir com codigo?

Primeiro reporta bug/pede feature no `#forgeclaw-suporte`. PR e aceitado de membros ativos da comunidade, caso a caso. Ver ACCESS.md.

## 16. E quando vier a v1.0 pagavel?

A comunidade pagina acompanha a evolucao. Nao ha v1 pagavel separada — ForgeClaw permanece beneficio da comunidade. Planos podem mudar no futuro, comunicado sempre no canal.

---

Mais duvidas? `#forgeclaw-suporte`.
