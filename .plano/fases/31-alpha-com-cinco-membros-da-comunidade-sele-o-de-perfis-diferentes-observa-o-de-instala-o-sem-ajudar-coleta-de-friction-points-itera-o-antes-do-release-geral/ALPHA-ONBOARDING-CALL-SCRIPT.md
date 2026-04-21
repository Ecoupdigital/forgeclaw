# Alpha Onboarding Call — Roteiro (30 min)

**Formato:** Google Meet ou Zoom, grupo de 6 (Jonathan + 5 alphas). Gravar a call.
**Objetivo:** Alinhar expectativa, garantir que os 5 comecem no mesmo instante, liberar acesso ao repo em direto para criar efeito "todo mundo junto".

## Pre-call checklist (Jonathan, 15 min antes)

- [ ] Abrir `.plano/fases/31-*/ALPHA-PLAYBOOK.md` no monitor 1
- [ ] Abrir este roteiro no monitor 2
- [ ] Abrir terminal com `cd /home/projects/ForgeClaw && bun run ops/gate/access.ts list` rodado (ver quem ja ta dentro)
- [ ] Ter os 5 GitHub usernames colados em bloco de notas
- [ ] Ter o link do repo privado pronto para colar
- [ ] Ter o link do formulario de feedback (Tally/Google Forms) pronto para colar
- [ ] Ativar gravacao

---

## Bloco 1 — Boas-vindas (3 min)

Fala:

> "Oi gente, obrigado por topar. Essa call vai durar uns 25-30 min. Ao final voces vao ter acesso ao repo privado e o ponto de partida pra instalar. A call e gravada — qualquer coisa que a gente falar aqui fica salvo pra voces reverem.
>
> A ideia do alpha e simples: voces sao os primeiros 5 humanos fora da EcoUp a mexer nesse produto. O que voces sentirem, reclamarem, amarem, odiarem — tudo vira priorizacao P0/P1/P2 pro release geral."

---

## Bloco 2 — O que e o ForgeClaw em 2 min (2 min)

Fala:

> "ForgeClaw e o seu AI Command Center pessoal. Imagina: voce roda o Claude Code no seu VPS ou maquina, conversa com ele via Telegram como se fosse um amigo, cada topico do Telegram vira uma sessao isolada, ele lembra de tudo que rolou, executa tarefas agendadas via cron, e voce controla tudo num dashboard web com 9 abas.
>
> No install, um entrevistador conversacional vai perguntar quem voce e, o que voce faz, e vai preencher o 'harness' do seu agente — que e tipo um system prompt rico, personalizado pra voce. Voces vao escolher um de 5 arquetipos: Solo Builder, Criador de Conteudo, Agencia/Freela, Gestor E-commerce, ou Generico."

(Compartilhar tela: abrir `README.md` e mostrar o topo por 30s)

---

## Bloco 3 — Expectativa do alpha (5 min)

Fala:

> "Regras do jogo, nessa ordem de importancia:
>
> **1. Nao vou ajudar voces nas primeiras 24h de install.**
> Isso eh de proposito. Se eu pular de cabeca ajudando cada trava, eu viro um scaffold humano que nao existe quando o release for geral. Quero ver ONDE o produto trava sem minha ajuda. Depois de 24h travado, se continuar travado, ai sim chama.
>
> **2. Gravem a tela durante o install.**
> OBS, QuickTime, o que for. Sem audio e OK. O video e ouro — eu vejo ali o ponto exato onde voces leem errado ou clicam errado, e isso me diz se e bug ou se e UX ruim.
>
> **3. Usem de verdade.**
> Nao e so instalar e dar OK. E usar o Telegram pra conversar com o agente por 5 dos 7 dias. Testar pelo menos 3 abas do dashboard. Criar um cron. Deixar o agente rodar por conta propria um pouco.
>
> **4. Ideias de feature guardem pro formulario.**
> Bug e UX imediato podem pingar no grupo. Mas ideia do tipo 'seria legal se tivesse X' vai pro formulario do D+7 — senao o grupo vira wishlist e eu perco o foco no que trava."

(Deixar 2 min pra perguntas aqui. Anotar qualquer duvida no ALPHA-OBSERVATION-SHEET global.)

---

## Bloco 4 — Metricas que serao coletadas (3 min)

Fala:

> "Nao me deixem em paz com 'ficou daora'. Eu preciso de numeros. O formulario do D+7 tem:
>
> - **T2FM:** Time To First Message. Do momento que voces rodaram `forgeclaw install` ate o momento que o Telegram respondeu a primeira mensagem. Anotem em minutos.
> - **Arquetipo:** qual voces escolheram, e no dia 7, se escolheriam o mesmo.
> - **Onboarding entrevistador:** voces completaram a entrevista ate o fim ou pularam pro template puro? Se pularam, onde.
> - **Bugs:** lista de tudo que deu erro. Copy-paste dos erros se tiver.
> - **NPS:** 'de 0 a 10, o quao provavel voce recomendaria o ForgeClaw pra outro membro da Dominando AutoIA?'
> - **Mais amou + mais odiou:** uma parte que voce ficou 'isso e magico' e uma parte que te fez querer desistir.
>
> E eu vou estar observando de fora. Tenho minha propria planilha que preencho por dia por pessoa. Nao precisam fazer nada alem do formulario do D+7."

---

## Bloco 5 — Entrega do acesso ao vivo (5 min)

(Ao vivo no terminal, compartilhando tela)

Para cada alpha, rodar:

```bash
cd /home/projects/ForgeClaw
bun run ops/gate/access.ts grant <github-username> \
    --member-email=<email> \
    --note="alpha fase 31 {DATA}"
```

Falar:

> "Pronto {NOME}, convite no teu email. Abre o GitHub, aceita o invite, e ja pode clonar."

(Cinco vezes, um por um. Total ~3 min. Enquanto gera o convite, os outros ja podem ir aceitando.)

Depois de todos:

```bash
bun run ops/gate/access.ts list
```

Mostrar: "So pra voces verem, todos os 5 estao la."

---

## Bloco 6 — Proximos passos + link do formulario (3 min)

Falar:

> "Proximas horas voces vao:
>
> 1. Aceitar o invite do GitHub (email)
> 2. Clonar o repo: `git clone https://github.com/Ecoupdigital/forgeclaw.git ~/forgeclaw`
> 3. Rodar o install: `cd ~/forgeclaw && bun install && bun run packages/cli/src/index.ts install`
> 4. Seguir o prompt. Escolher seu arquetipo. Completar a entrevista.
> 5. Mandar primeira mensagem no Telegram.
> 6. Anotar T2FM.
>
> Link do formulario do D+7 (preenchem ao final da semana, nao agora): {LINK_FORMULARIO}
>
> Link do grupo privado do Telegram: {LINK_GRUPO}
>
> Nos vemos la. Vai travar. Esta tudo bem. E pra isso que voces estao aqui."

---

## Bloco 7 — Q&A final (5 min)

Abrir pra perguntas. Anotar todas no `ALPHA-OBSERVATION-SHEET.md` da pessoa ou no log global da call. Responder so o que for ambiguidade — se for "como eu faco X" que ta documentado, redirecionar pros docs.

---

## Pos-call checklist (Jonathan, imediatamente)

- [ ] Salvar gravacao da call em `.plano/fases/31-*/recordings/kickoff-YYYY-MM-DD.mp4`
- [ ] Transcrever perguntas feitas durante a call e anexar ao `ALPHA-OBSERVATION-SHEET.md` global
- [ ] Confirmar via `bun run ops/gate/access.ts list` que os 5 aparecem
- [ ] Postar no grupo: "Call encerrada. Agora e com voces. Gravei o install? otimo. Travou? respira fundo, anota, tenta mais uma vez antes de me chamar."
- [ ] Agendar calendar reminder para D+3 (checagem de progresso) e D+7 (cut-off do formulario)
