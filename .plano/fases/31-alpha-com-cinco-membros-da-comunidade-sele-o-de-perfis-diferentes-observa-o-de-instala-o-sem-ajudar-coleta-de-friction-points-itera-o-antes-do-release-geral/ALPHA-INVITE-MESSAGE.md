# Alpha Invite — Mensagens Prontas

Tres mensagens copy-paste:

1. **Convite inicial (DM)** — para cada candidato da matriz final.
2. **Confirmacao apos aceite (DM)** — depois da pessoa topar.
3. **Boas-vindas (grupo privado)** — quando os 5 estiverem dentro e o grupo for criado.

---

## 1. Convite inicial (DM individual)

Personalizacoes: `{NOME}`, `{QUANDO_ENTROU}`.

```
e ai {NOME}, beleza?

to montando um alpha fechado do ForgeClaw antes de liberar pra comunidade toda e queria te chamar como um dos 5 primeiros a testar.

ForgeClaw = AI Command Center pessoal. Claude Code rodando no teu VPS/maquina, respondendo via Telegram com isolamento por topico, dashboard web com 9 abas (sessoes, cron, memoria, agentes, webhooks, tokens), e um onboarding conversacional que te entrevista pra preencher o harness (a "personalidade" do teu assistente). Voce virou membro em {QUANDO_ENTROU}, entao ja pegou o espirito da comunidade.

o que eu preciso de voce:

1. Que voce tenha Claude Max (Pro ou Team). sem isso nao roda.
2. Que voce instale em Linux ou macOS (Windows nao entra nessa primeira leva).
3. Que voce topa um compromisso de uma semana: instalar no dia combinado, usar pelo menos 5 dos 7 dias, e responder um formulario estruturado no final (NPS, o que amou, o que odiou, bugs encontrados).

o que voce ganha:

- Acesso ao repo privado (v1 pra membros, valor $150+/mes em planos futuros).
- Influencia direta nas decisoes antes do release geral.
- Canal privado no Telegram so com os 5 alphas + eu — suas pedidos de feature e bugs viram prioridade P0/P1.

regra importante: **durante a primeira instalacao, eu nao vou te ajudar.** Isso e de proposito. Quero ver onde o produto trava sem ter suporte humano cobrindo os buracos. Se travar mais de 24h, a me chama. Mas nos primeiros 24h voce esta por conta propria com os docs.

topa?

se topar, me responde com:
- GitHub username
- Sistema operacional (linux / macos + versao)
- Nivel tecnico que voce se considera (iniciante / intermediario / avancado)
- Qual arquetipo te representa melhor: solo builder / criador de conteudo / agencia ou freela / gestor de e-commerce / generico

abraco
```

---

## 2. Confirmacao apos aceite (DM individual)

Personalizacoes: `{NOME}`, `{DATA_KICKOFF}`, `{LINK_CALL}`, `{LINK_GRUPO}`.

```
fechado {NOME}!

adicionei voce ao grupo privado do alpha: {LINK_GRUPO}

Kickoff call: {DATA_KICKOFF} (30 min, grupo com os 5). Link: {LINK_CALL}

Pre-call (faca antes):
- Confirmar que Claude CLI esta autenticado na sua maquina (rodar `claude --version` no terminal)
- Ter bun >= 1.1.0 instalado (rodar `bun --version`). Se nao tiver, instalar: `curl -fsSL https://bun.sh/install | bash`
- Reservar 1-2h no dia do kickoff pra instalacao

O convite pro repo privado vou liberar durante a call pra todo mundo comecar junto.

Qualquer duvida antes da call, me chama aqui.
```

---

## 3. Boas-vindas (grupo privado)

Personalizacoes: `{DATA_KICKOFF}`, `{LINK_FORMULARIO}`.

```
Galera, bem-vindos ao Alpha ForgeClaw 👋

Voces sao os 5 primeiros humanos fora do nucleo da EcoUp a instalar esse produto. O que rolar aqui define se o release geral acontece semana que vem ou daqui 3 semanas.

Como funciona:

**D0 — {DATA_KICKOFF}**
- Kickoff call (30 min): apresentacao, expectativa, libero acesso ao repo
- Apos a call: voces instalam. SEM MINHA AJUDA nas primeiras 24h.
- Gravem a tela durante a instalacao (OBS ou QuickTime). Serve de ouro pra eu ver onde trava.

**D1-D6**
- Usem o produto de verdade. Telegram, dashboard, crons, memoria, agentes.
- Cada vez que algo nao fizer sentido ou travar, anotem. Nao me chamem correndo — anotem primeiro.

**D+7**
- Preencham o formulario estruturado: {LINK_FORMULARIO}
- 15-20 min de formulario. Esse eh o artefato principal que vai direcionar o release.

**Regras do grupo:**
- Spoiler livre — mostrem tela, falem de bugs, compartilhem o harness de voces.
- Feedback bruto e bem-vindo. Nao tem que suavizar nada.
- Se algo quebrar completamente (nao consegue nem abrir o dashboard), pinga aqui com @Jonathan + screencast.
- Ideia de feature? Guarda pro formulario final. Aqui no grupo e so bug/install/UX imediato.

Vamo pra cima.
```

---

NAO alterar o tom. Jonathan fala informal, voice-to-text, sem emoji excessivo (so um ou dois em toda conversa). Mantem minusculas em coisas como "e ai", "fechado", "galera". Isso e intencional.
