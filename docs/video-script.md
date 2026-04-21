# Video Walkthrough — Roteiro de 5 Minutos

> Este arquivo e o roteiro. O video gravado vai viver em YouTube/Vimeo apos a fase Alpha (31). Ate la, o roteiro serve tambem como versao escrita do walkthrough pra quem preferir ler.

## Briefing

**Publico:** membro da comunidade Dominando AutoIA que acabou de receber acesso ao ForgeClaw e quer entender em 5 min se vale o esforco de instalar.

**Objetivo:** mostrar que o ForgeClaw (1) instala rapido, (2) ja vem com personalidade, (3) atende falar via Telegram, (4) roda autonomo via cron, (5) da pra confiar.

**Tom:** informal, direto, sem voz de tutorial robo. Voce falando como se fosse no grupo da comunidade.

**Duracao alvo:** 5:00 a 5:30 min. Corta se estiver mais longo.

## Setup pre-gravacao

Antes de apertar REC, prepare o ambiente:

1. ForgeClaw instalado com arquetipo **Solo Builder** (mais generico pra audiencia dev-tecnica)
2. Bot Telegram com 3 topics ja criados: `geral`, `codigo`, `daily-review`
3. Dashboard com alguns dados seed (ver `scripts/seed-demo.ts` no futuro — por enquanto, captura com seu uso real sanitizado)
4. Dois terminais abertos lado a lado: um pro `bun run cli install`, outro pro `bun run dev:bot`
5. Telegram desktop maximizado numa segunda tela (ou em floating window)

## Checklist de privacidade (CRITICO)

**Antes de cada corte, verificar que nao aparece na tela:**

- [ ] Token real do bot Telegram (mascara no installer mas confirma)
- [ ] Token real do dashboard (`dashboardToken` no forgeclaw.config.json)
- [ ] Seu Telegram User ID real
- [ ] Nome de arquivo de cliente real (evitar paths com nome de empresa)
- [ ] Caminhos `/home/vault/...` ou similares que exponham estrutura pessoal
- [ ] Mensagens de Telegram de projetos reais (usar mensagens fake pra demo)
- [ ] Nome do usuario do sistema (se aparece no prompt do shell, troca pro `user@demo`)
- [ ] Chaves de API em `.env`
- [ ] URL do seu VPS de producao

**Se aparecer algo por acidente:** corte e regrave. Nao edite borrao em post — o video vive no repo privado mas pode vazar.

---

## Bloco 1 — Gancho (0:00 a 0:15)

**Cena:** tela cheia do Telegram com uma mensagem voce digitando: "revisa meu dia e me ve 3 pontos pra amanha". Envia. Resposta comeca a streamar em tempo real.

**Narracao:**

> "Isso aqui e o que eu mando no Telegram as 10 da noite. Mando, cresco esticar o sofa, e quando volto a IA ja tem tudo. Nao e API publica, nao e app instalado no celular. E uma IA pessoal rodando na minha maquina, com memoria, agentes especializados e cron em portugues. Chama ForgeClaw."

**Acao de tela:** deixa a resposta terminar de streamar. No final mostra 3 bullets logicos (hint: `{{today}}` no prompt faz o Claude puxar o daily log).

---

## Bloco 2 — Problema (0:15 a 0:45)

**Cena:** split-screen: esquerda mostra terminal com Claude Code rodando; direita mostra Telegram/ChatGPT apps comum.

**Narracao:**

> "A maior parte das IAs que voce usa e chat em aplicativo. Fecha o laptop, IA para. Outras, como o Claude Code, e incrivel mas fica preso no terminal — voce sai de casa e abandonou. E se voce quer juntar o melhor dos dois? Voce fala de qualquer lugar (Telegram), e o Claude Code roda no seu computador, com acesso aos seus arquivos, suas memoria, seus projetos."

> "E isso que o ForgeClaw entrega. Vou te mostrar em 5 min."

**Acao de tela:** cursor passa entre as duas janelas pra reforcar split-screen. Fade out.

---

## Bloco 3 — Instalacao (0:45 a 3:00)

**Cena 3a (0:45 a 1:15):** terminal limpo. Rodando:
```bash
git clone https://github.com/Ecoupdigital/forgeclaw.git
cd forgeclaw
bun install
```

**Narracao:** "Voce tem o repo privado porque entrou na comunidade. Clona, `bun install`, e aperta instalador."

**Cena 3b (1:15 a 2:00):** rodando `bun run cli install` — Fase A pergunta token, Telegram ID, vault, voice provider.

**Narracao:** "Fase tecnica: ele confirma que Claude CLI esta autenticado, pede o token do bot, seu ID Telegram, onde fica seu vault. Voz, eu uso Groq — e gratis ate 100k req por dia."

**Cena 3c (2:00 a 2:30):** Fase B — picker de arquetipo. Voce escolhe Solo Builder.

**Narracao:** "Aqui eu escolho qual arquetipo sou. Solo Builder, Criador de Conteudo, Agencia, E-commerce ou Generico. Escolhi Solo Builder porque mexo em codigo o dia todo. Ele ja ajusta o harness — que e o conjunto de 6 arquivos markdown que descrevem quem e essa IA — pro perfil dev indie."

**Cena 3d (2:30 a 3:00):** Fase C — dashboard sobe, browser abre em `/onboarding`. Voce responde 3-4 perguntas da persona entrevistadora e aprova os diffs no harness.

**Narracao:** "Fase C: ele sobe o dashboard e abre a tela de onboarding. E aqui que acontece a magica — uma IA entrevistadora conversa comigo pra deixar o harness customizado de verdade. A cada resposta ela mostra o diff dos arquivos. Eu aprovo, ela escreve."

**Acao de tela:** mostra o chat do onboarding por 10-15s, depois um close-up do diff no painel direito.

---

## Bloco 4 — Uso (3:00 a 4:00)

**Cena 4a (3:00 a 3:20):** abre Telegram, manda primeira mensagem no topic `geral`: "Oi, voce sabe o que eu faco?"

**Narracao:** "Primeira mensagem. Ela ja sabe quem eu sou porque respondeu no onboarding. Isso tambem ficou salvo no USER.md."

**Cena 4b (3:20 a 3:40):** cria um topic `codigo`, manda "No projeto atual, o que falta fazer?". Resposta diferente — ele puxa contexto do vault / Obsidian.

**Narracao:** "Outro topic, outra sessao isolada. Contexto nao mistura. Posso vincular um agente especialista aqui — um Code Agent, por exemplo."

**Cena 4c (3:40 a 4:00):** abre dashboard aba Automacoes. Mostra um cron existente:
```
Todo dia as 23h -> topico Daily Review
Revise meu dia e me da 3 destaques
```
Clica em **Run now** pra mostrar funcionando ao vivo. Resultado aparece no Telegram.

**Narracao:** "E o melhor: ela trabalha sozinha. Cron em portugues simples. Todo dia as 23h ela revisa meu dia e me entrega. Eu nem precisei estar online."

---

## Bloco 5 — Call to action (4:00 a 5:00)

**Cena:** fecha dashboard, fica so voce na camera.

**Narracao:**

> "Esse foi o ForgeClaw. Se voce e da comunidade, roda o install e bora — se tiver duvida, #forgeclaw-suporte e rapido. Se voce descobriu isso aqui sem ser da comunidade, a gente esta em comunidadeautomiaia.com.br — pra entrar custa R$ 67 por mes e voce ganha acesso nao so ao ForgeClaw mas a todo o conteudo e suporte do que eu construo em IA pessoal."

> "Documentacao completa: README do repo e pasta docs/. Qualquer coisa fala comigo la no canal. Ate mais."

**Acao de tela:** fade-out com logo ForgeClaw + URL `comunidadeautomiaia.com.br` + nome do canal `#forgeclaw-suporte`.

---

## Edicao final

- **Corte em cortes secos.** Sem transicoes fancy. Ritmo dev/tutorial, nao marketing.
- **Musica:** opcional. Se usar, algo lo-fi baixo. Sem vocal.
- **Legendas:** gerar com Whisper do Groq (script separado fora deste plano).
- **Export:** 1080p 30fps. YouTube privado/unlisted primeiro pra comunidade revisar.

## Referencias de screenshot

As cenas acima se cruzam com os arquivos de `docs/screenshots/`:

| Cena | Screenshot |
|------|-----------|
| Bloco 1 (resposta) | `08-primeiro-hello.png` |
| Bloco 3a | `01-clone-install.png` (capturar) |
| Bloco 3b | `02-installer-faseA.png` |
| Bloco 3c | `03-installer-faseB.png` |
| Bloco 3d | `05-onboarding-chat.png`, `06-onboarding-diff.png` |
| Bloco 4b | `09-topics-isolamento.png` |
| Bloco 4c | `10-primeiro-cron.png`, `tab-automacoes.png` |

Captura automatizada: `bun run scripts/capture-screenshots.ts`.
