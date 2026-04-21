# Alpha Feedback Template — Fase 31

Este documento define TODAS as perguntas do formulario que os 5 alphas preenchem no D+7.

**Ferramenta sugerida:** Tally (tally.so) — gratis, sem login obrigatorio, suporta todos os tipos abaixo e gera CSV.
**Alternativa:** Google Forms (se a comunidade ja usa).

**Tempo estimado de preenchimento:** 15-20 min.

**Link curto a enviar:** encurtar via bit.ly ou dominio proprio (ex: forgeclaw.dev/alpha-feedback) para facilitar no grupo.

## Configuracao global do form

- Exigir login (Tally "require email") — SIM. Precisa saber quem respondeu.
- Uma resposta por pessoa (Tally "limit responses") — SIM.
- Permitir voltar/editar — SIM.
- Data limite — configurar para D+7 23:59 timezone America/Sao_Paulo.

---

## Secao 1 — Identificacao (3 perguntas)

1. **Seu GitHub username**
   - Tipo: short text
   - Obrigatorio: sim
   - Placeholder: `fulanosilva`

2. **Nivel tecnico que voce acha que e hoje (depois do alpha)**
   - Tipo: single select
   - Obrigatorio: sim
   - Opcoes: `Iniciante`, `Intermediario`, `Avancado`
   - Label extra: "Responde sem pensar no que voce disse antes — o alpha pode ter mudado sua percepcao."

3. **Sistema operacional onde instalou**
   - Tipo: single select
   - Obrigatorio: sim
   - Opcoes: `Ubuntu 22.04`, `Ubuntu 24.04`, `macOS Intel`, `macOS Apple Silicon`, `Outro Linux (especifique em comentario)`, `Outro`

---

## Secao 2 — Instalacao (8 perguntas)

4. **T2FM — Time To First Message (MINUTOS)**
   - Tipo: number
   - Obrigatorio: sim
   - Label extra: "Do momento que voce rodou `forgeclaw install` ate o momento que o Telegram respondeu sua primeira mensagem. Se nao conseguiu chegar a primeira mensagem, responda 999."
   - Range: 0-999

5. **Voce conseguiu instalar sozinho, sem precisar pingar o Jonathan?**
   - Tipo: single select
   - Obrigatorio: sim
   - Opcoes: `Sim, primeira tentativa`, `Sim, apos reiniciar 1x o install`, `Sim, apos pingar nas primeiras 24h... 48h`, `Nao consegui sem ajuda direta`

6. **Instalacao em quantos minutos aprox.? (do `forgeclaw install` ate o dashboard abrir)**
   - Tipo: number
   - Obrigatorio: sim
   - Range: 0-999
   - Label extra: "Conta o tempo total incluindo downloads e install do bun."

7. **Qual arquetipo voce escolheu?**
   - Tipo: single select
   - Obrigatorio: sim
   - Opcoes: `Solo Builder`, `Criador de Conteudo`, `Agencia/Freela`, `Gestor E-commerce`, `Generico`

8. **Hoje, no D+7, voce escolheria o mesmo arquetipo?**
   - Tipo: single select
   - Obrigatorio: sim
   - Opcoes: `Sim`, `Nao, escolheria: Solo Builder`, `Nao, escolheria: Criador de Conteudo`, `Nao, escolheria: Agencia/Freela`, `Nao, escolheria: Gestor E-commerce`, `Nao, escolheria: Generico`, `Sem opiniao`

9. **Voce completou a entrevista do onboarding ate o fim?**
   - Tipo: single select
   - Obrigatorio: sim
   - Opcoes: `Sim, ate o fim`, `Nao, pulei para o template puro em X% do caminho`, `Nao usei entrevista, fui direto no template`

10. **Se nao completou a entrevista, em qual pergunta/bloco desistiu? (opcional)**
    - Tipo: long text
    - Obrigatorio: nao

11. **Qual parte do install foi mais confusa?**
    - Tipo: long text
    - Obrigatorio: sim
    - Label extra: "Seja bruto. 'A pergunta do Claude CLI token apareceu sem explicar onde pegar.' Nao e ofensa, e UX."

---

## Secao 3 — Uso diario (7 perguntas)

12. **Em quantos dos 7 dias voce usou o produto ativamente?**
    - Tipo: number
    - Obrigatorio: sim
    - Range: 0-7

13. **Quantas mensagens voce mandou pro agente via Telegram (estimativa)?**
    - Tipo: single select
    - Obrigatorio: sim
    - Opcoes: `0-5`, `6-20`, `21-50`, `51-100`, `100+`

14. **Quais abas do dashboard voce abriu pelo menos uma vez?**
    - Tipo: multi select (checkbox)
    - Obrigatorio: sim
    - Opcoes: `Sessoes`, `Automacoes (cron)`, `Memoria`, `Configuracoes`, `Personalidade (harness)`, `Agentes`, `Webhooks`, `Tokens`, `Atividade`

15. **Voce criou pelo menos um cron?**
    - Tipo: yes/no
    - Obrigatorio: sim

16. **Voce mandou mensagem de voz pro bot e viu transcricao?**
    - Tipo: yes/no
    - Obrigatorio: sim

17. **O harness (personalidade) foi editado por voce alem do que o onboarding gerou?**
    - Tipo: single select
    - Obrigatorio: sim
    - Opcoes: `Nao mexi mais, ta bom`, `Editei um pouco`, `Refiz quase tudo`, `Nao sei o que e harness`

18. **Qual parte do produto voce mais usou de verdade?**
    - Tipo: long text
    - Obrigatorio: sim
    - Label extra: "O que virou util no dia a dia? Especifique. 'chat via telegram pra dump de ideia' vale. 'gostei' nao vale."

---

## Secao 4 — Bugs e travamentos (4 perguntas)

19. **Liste todos os bugs que voce encontrou (1 por linha).**
    - Tipo: long text
    - Obrigatorio: sim
    - Label extra: "Formato: '[gravidade: critico/medio/menor] descricao'. Ex: '[critico] dashboard nao abre apos install em mac M1 — erro ENOENT sqlite.' Copia stack trace se tiver."

20. **Teve algum momento que voce quase desistiu do produto?**
    - Tipo: long text
    - Obrigatorio: sim
    - Label extra: "Pode ser algo que nem e bug — so uma friccao que te tirou do mood. 'No D3 o bot parou de responder por 30 min e eu desisti de esperar.'"

21. **Teve travamento que voce mesmo resolveu? Como?**
    - Tipo: long text
    - Obrigatorio: nao

22. **Em uma escala 0-10, qual a estabilidade do produto hoje?**
    - Tipo: rating (0-10)
    - Obrigatorio: sim

---

## Secao 5 — Sentimento e NPS (6 perguntas)

23. **Qual foi a parte que voce MAIS AMOU?**
    - Tipo: long text
    - Obrigatorio: sim
    - Label extra: "Momento 'uau, isso e magico'. Seja especifico."

24. **Qual foi a parte que voce MAIS ODIOU?**
    - Tipo: long text
    - Obrigatorio: sim
    - Label extra: "Momento 'nao acredito que to tendo que fazer isso'. Pode ser UX, bug recorrente, mensagem de erro ruim."

25. **NPS — De 0 a 10, o quao provavel voce recomendaria o ForgeClaw para outro membro da Dominando AutoIA?**
    - Tipo: rating (0-10)
    - Obrigatorio: sim

26. **Por que esse numero?**
    - Tipo: long text
    - Obrigatorio: sim

27. **Uma feature que se tivesse hoje faria voce amar o produto incondicionalmente?**
    - Tipo: long text
    - Obrigatorio: sim

28. **Comentario final livre — qualquer coisa que nao coube nas perguntas acima.**
    - Tipo: long text
    - Obrigatorio: nao

---

## Metricas agregadas (calculadas apos coletar os 5)

O relatorio final (PLAN 31-03) vai calcular:

- **T2FM medio** (media de Q4)
- **T2FM mediano** (mediano de Q4)
- **% que completou entrevista** (% de Q9 = "Sim, ate o fim")
- **Taxa de auto-sucesso** (% de Q5 = "Sim, primeira tentativa" ou "Sim, apos reiniciar 1x")
- **Cobertura de abas** (media de quantas abas marcadas em Q14, ideal >= 5)
- **Arquetipo drift** (% que escolheria outro arquetipo hoje — Q8 != "Sim")
- **NPS agregado** (Q25)
- **Estabilidade percebida** (media de Q22)
- **Top 3 bugs criticos** (extraidos de Q19)
- **Top 3 frictions** (extraidos de Q20 + Q24)
- **Feature mais pedida** (clustering de Q27)

## Instrucoes de criacao em Tally

1. Abrir tally.so, criar workspace "ForgeClaw" (se nao existe).
2. New form → Blank.
3. Title: "ForgeClaw Alpha Feedback — Fase 31"
4. Description: "Formulario do D+7. Responde so depois de ter usado o produto por pelo menos 5 dias. ~15-20 min. Seja bruto e especifico."
5. Add questions section by section seguindo secoes 1-5 acima.
6. Config: require email = ON, limit to 1 response per email = ON.
7. Thank you page: "Obrigado. Isso vai direto pro relatorio final que decide o release geral. Voce ganhou ponto."
8. Publish → copiar link → colar em ALPHA-INVITE-MESSAGE.md bloco 3.

## Instrucoes de criacao em Google Forms (alternativa)

1. forms.google.com → Blank.
2. Title: "ForgeClaw Alpha Feedback — Fase 31"
3. Settings → Responses → Collect email addresses = YES → Limit to 1 response = YES (requer login com conta Google).
4. Add questions section by section.
5. Copiar link → colar em ALPHA-INVITE-MESSAGE.md.
