# Crons — Tarefas Agendadas

ForgeClaw tem 2 formas de criar tarefas agendadas:

1. **Editar `~/.forgeclaw/HEARTBEAT.md`** — arquivo markdown com sintaxe em portugues natural
2. **Dashboard aba Automacoes** — CRUD visual (ver [dashboard-tour.md#automacoes](./dashboard-tour.md#automacoes))

Ambas coexistem. Jobs do HEARTBEAT tem origem `file`. Jobs do dashboard tem origem `db`. Jobs `file` sao read-only no dashboard (voce edita o arquivo direto).

![screenshot](./screenshots/crons-overview.png)

## HEARTBEAT.md

Mora em `~/.forgeclaw/HEARTBEAT.md`. Sintaxe:

````markdown
## <schedule em portugues> -> topico: <Nome do Topico>

- Prompt linha 1
- Prompt linha 2
- ...
````

Exemplo completo:

```markdown
## Todo dia as 23h30 -> topico: Daily Review

- Revise os daily logs de hoje
- Liste os 3 destaques
- Aponte 1 pendencia pra amanha

## Toda segunda as 8h -> topico: Weekly Planning

- Compile o progresso da semana passada
- Sugira prioridades pra esta semana

## A cada 30 minutos -> topico: Monitoring

- Checa status dos servicos produtivos
```

Salvar o arquivo dispara hot-reload (file watcher) — os jobs sao recarregados sem reiniciar bot.

## Schedules suportados

| Formato | Exemplo |
|---------|---------|
| `Todo dia as Xh` | `Todo dia as 8h` |
| `Todo dia as XhYY` | `Todo dia as 23h30` |
| `Toda hora` | `Toda hora` |
| `Toda segunda as Xh` (e outros dias da semana) | `Toda segunda as 9h` |
| `A cada N minutos` | `A cada 30 minutos` |
| Cron expression classica | `*/5 * * * *` |

Se o parser nao reconhecer, o job e marcado como invalido e voce ve no dashboard (aba Automacoes, badge vermelho).

## Criar via dashboard

Dashboard > aba **Automacoes** > botao **Novo cron**.

Campos:

- **Nome:** descritivo. Ex: "Daily review".
- **Schedule:** cron expression (se fora do vocabulario natural) ou expressao portugues.
- **Target topic:** escolhe o topic (Telegram) onde o resultado cai. Pode ser `null` = topic default.
- **Prompt:** texto enviado ao Claude na execucao. Template vars disponiveis: `{today}`, `{yesterday}`, `{now}`.
- **Skill:** opcional. Se setado, a skill e pre-ativada no contexto do Claude.

Preview:
- Versao human-legivel (cronstrue)
- Proximos 3 horarios de disparo (cron-parser)

![screenshot](./screenshots/cron-form.png)

## Template vars

Uteis em prompts de cron:

| Var | Expandida para |
|-----|----------------|
| `{today}` | Data atual ISO local: `2026-04-21` |
| `{yesterday}` | Data de ontem: `2026-04-20` |
| `{now}` | Timestamp local com hora: `2026-04-21T14:30:00` |

Calculo e feito uma vez por execucao (reutilizado no retry).

## Roteamento por topico

Quando um cron executa:

1. CronEngine roda o prompt via ClaudeRunner (one-shot, sem sessao persistente)
2. O resultado vai pro EventBus
3. O bot escuta e envia a mensagem no `target_topic_id` configurado

Se o target for `null`, cai no topic default do bot (primeiro topic criado).

## Executar agora (run-now)

No dashboard, card do cron tem botao **Executar agora**. Util pra testar antes de esperar o schedule. Nao conta como execucao regular — nao move o `last_run`.

## Logs

Cada execucao gera entry na tabela `cron_logs` com:
- `started_at`, `finished_at`
- `status` (running / ok / failed)
- `output` (texto final entregue ao topic)
- `error` (se falhou)

Voce ve tudo isso na mesma aba Automacoes, botao **Ver logs** no card.

![screenshot](./screenshots/crons-logs.png)

## Hot reload

- HEARTBEAT.md salvo -> file watcher detecta (debounce 500ms) -> jobs `file` recarregados
- Job criado/editado via dashboard -> CronEngine atualizado em memoria imediatamente

Nao precisa reiniciar bot nem dashboard.

## Falha e retry

Por padrao, crons que falham sao logados e o output contem o erro. Voce pode:

- Reexecutar manualmente (botao Run-now)
- Ajustar o prompt e salvar (hot reload pega)
- Desativar o job temporariamente (toggle)

Falhas recorrentes aparecem com prefixo `[FAILED]` no log e com prefixo visual no Telegram quando o roteamento acontece.

## Problemas comuns

- [Schedule nao e reconhecido](./troubleshooting.md#schedule-invalido)
- [Cron nao disparou no horario](./troubleshooting.md#cron-nao-disparou)
- [Output do cron nao chegou no Telegram](./troubleshooting.md#cron-output-perdido)
