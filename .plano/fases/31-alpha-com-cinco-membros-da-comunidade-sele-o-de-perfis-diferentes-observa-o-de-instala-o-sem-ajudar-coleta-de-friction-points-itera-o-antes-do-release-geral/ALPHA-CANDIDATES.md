# Alpha Candidates — Matriz de Selecao

Este documento serve para Jonathan listar >= 10 candidatos da comunidade Dominando AutoIA e aplicar criterios objetivos para selecionar os 5 alphas do ForgeClaw.

**Meta:** 5 alphas com perfis distribuidos (2 avancados tecnicamente, 2 intermediarios, 1 iniciante) e arquetipos distintos quando possivel.

## Criterios obrigatorios (elimina se falhar qualquer um)

- [ ] E membro ativo da Dominando AutoIA (subscription em dia no Asaas)
- [ ] Tem Claude Max (Pro/Team plan — nao sera possivel rodar sem CLI autenticado)
- [ ] Tem maquina Linux (Ubuntu 22.04+ preferencialmente) ou macOS (Intel/ARM)
- [ ] Topa compromisso formal: instalar em D0, usar >=5 dias dos 7, preencher formulario no D+7
- [ ] Tem GitHub username publico (necessario para `bun run ops/gate/access.ts grant`)

## Criterios de diversidade (balancear entre os 5)

- **Nivel tecnico:** 2 avancados, 2 intermediarios, 1 iniciante
  - Avancado = escreve codigo diario, familiar com terminal, ja usou Claude Code CLI
  - Intermediario = usa terminal, roda scripts, ja seguiu tutoriais tecnicos de ponta a ponta
  - Iniciante = usa Claude pelo chat web, nunca tocou CLI em projeto real
- **Arquetipo pretendido:** idealmente um alpha por arquetipo (Solo Builder, Criador de Conteudo, Agencia/Freela, Gestor E-commerce, Generico). Se faltar gente de um arquetipo, substituir por outro Solo Builder.
- **Sistema operacional:** meta 3 Linux + 2 macOS (cobre a maior parte da base de membros). Windows NAO entra no alpha v1.
- **Perfil pessoal:** ao menos 1 pessoa que fala alto e reclama (util), ao menos 1 pessoa quieta e observadora (pega bugs que os falantes esquecem).

## Criterios de desempate

- Tempo na comunidade (quanto mais antigo, mais contexto do produto)
- Participacao em calls/lives anteriores (nao fantasma)
- Ja ajudou outros membros publicamente (reciprocidade alta)

## Matriz de candidatos

Preencher com todos os candidatos possiveis (>= 10) antes de escolher os 5. Usar score de 0-5 em cada coluna.

| # | Nome / handle | GitHub username | Claude Max? | SO (linux/mac) | Nivel tecnico (ini/int/avc) | Arquetipo pretendido | Tempo na comunidade | Score diversidade (0-5) | Score compromisso (0-5) | Total | Selecionado? |
|---|---------------|-----------------|-------------|----------------|-----------------------------|----------------------|---------------------|-------------------------|-------------------------|-------|--------------|
| 1 |               |                 |             |                |                             |                      |                     |                         |                         |       | [ ]          |
| 2 |               |                 |             |                |                             |                      |                     |                         |                         |       | [ ]          |
| 3 |               |                 |             |                |                             |                      |                     |                         |                         |       | [ ]          |
| 4 |               |                 |             |                |                             |                      |                     |                         |                         |       | [ ]          |
| 5 |               |                 |             |                |                             |                      |                     |                         |                         |       | [ ]          |
| 6 |               |                 |             |                |                             |                      |                     |                         |                         |       | [ ]          |
| 7 |               |                 |             |                |                             |                      |                     |                         |                         |       | [ ]          |
| 8 |               |                 |             |                |                             |                      |                     |                         |                         |       | [ ]          |
| 9 |               |                 |             |                |                             |                      |                     |                         |                         |       | [ ]          |
| 10|               |                 |             |                |                             |                      |                     |                         |                         |       | [ ]          |

## Regra final de selecao

1. Eliminar quem falhar qualquer criterio obrigatorio (coluna "Claude Max?" nao, ou nao topou compromisso).
2. Entre os restantes, ordenar por Total desc.
3. Pegar os 5 topo GARANTINDO distribuicao de nivel tecnico (2 avc / 2 int / 1 ini). Se o topo tiver 3 avancados, trocar o 3o avancado pelo proximo intermediario/iniciante da lista.
4. Confirmar que os 5 escolhidos cobrem pelo menos 3 arquetipos diferentes. Se cair tudo em Solo Builder, trocar o 5o por alguem de outro arquetipo mesmo com score menor.

## Lista final dos 5 alphas

Preencher apos a selecao:

1. `handle` (GitHub: `username`) — nivel: `avc/int/ini` — arquetipo: `slug` — SO: `linux/mac`
2. ...
3. ...
4. ...
5. ...

**Data da selecao final:** ____/____/____
**Selecionado por:** Jonathan
