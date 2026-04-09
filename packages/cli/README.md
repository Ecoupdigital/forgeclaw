# forgeclaw (CLI)

CLI installer do ForgeClaw com onboarding interativo. Configura tudo: dependencias, config, harness, servico do sistema.

## Instalacao

```bash
# Via npx (quando publicado)
npx forgeclaw install

# Desenvolvimento local
cd packages/cli
bun run dev install
```

## Comandos

### `forgeclaw install`

Onboarding interativo completo:

1. Verifica dependencias (bun, claude CLI)
2. Verifica autenticacao do Claude
3. Pede token do bot Telegram
4. Pede Telegram User ID
5. Configura diretorio de projetos
6. Configura Obsidian Vault (opcional)
7. Configura provider de voz (Whisper / nenhum)
8. Pede info do usuario (nome, empresa, role) para o harness
9. Gera `~/.forgeclaw/forgeclaw.config.json`
10. Gera arquivos do Harness (SOUL.md, USER.md, AGENTS.md, TOOLS.md, MEMORY.md, STYLE.md)
11. Detecta projetos existentes no diretorio
12. Opcionalmente configura servico do sistema (systemd/launchd)

### `forgeclaw update`

Re-roda o installer preservando valores existentes. Campos ja preenchidos aparecem como valor inicial.

### `forgeclaw status`

Mostra status de todos os componentes:

```
  ForgeClaw Status

  ● Service: running
  ● Config: ~/.forgeclaw/forgeclaw.config.json
  ● Database: ~/.forgeclaw/db/forgeclaw.db
  ● Harness: 6/6 files
  ● Claude CLI: available
```

### `forgeclaw uninstall`

Remove o ForgeClaw:

1. Confirmacao dupla
2. Para o servico
3. Remove configuracao do servico (systemd/launchd)
4. Opcionalmente remove dados (`~/.forgeclaw/`)

### `forgeclaw logs`

Tail em tempo real do log do bot:

```bash
forgeclaw logs
# Equivale a: tail -f ~/.forgeclaw/logs/bot.log
```

## Servico do Sistema

O installer configura o bot como servico:

### Linux (systemd)

- Unit file: `/etc/systemd/system/forgeclaw.service`
- Auto-restart com `RestartSec=5`
- Habilitado no boot (`WantedBy=multi-user.target`)

### macOS (launchd)

- Plist: `~/Library/LaunchAgents/com.forgeclaw.bot.plist`
- `RunAtLoad` e `KeepAlive` habilitados
- Logs em `~/.forgeclaw/logs/bot.log` e `bot.err.log`

## Harness Templates

O installer gera 6 arquivos na primeira instalacao:

| Arquivo | Conteudo |
|---------|----------|
| `SOUL.md` | Identidade da IA, principios, estilo de comunicacao |
| `USER.md` | Perfil do usuario (nome, empresa, role, preferencias) |
| `AGENTS.md` | Agentes disponiveis e regras de routing |
| `TOOLS.md` | Ferramentas built-in e integracoes |
| `MEMORY.md` | Sistema de memoria (como funciona, formato) |
| `STYLE.md` | Guia de estilo de comunicacao |

Na atualizacao (`forgeclaw update`), os arquivos existentes sao sobrescritos.

## Estrutura

```
src/
  index.ts                  # Entry point -- CLI router
  commands/
    install.ts              # Onboarding interativo (@clack/prompts)
    uninstall.ts            # Remocao com confirmacao dupla
    status.ts               # Status de componentes
    logs.ts                 # Tail de logs
  templates/
    soul.ts                 # Template SOUL.md
    user.ts                 # Template USER.md (recebe nome/empresa/role)
    agents.ts               # Template AGENTS.md
    tools.ts                # Template TOOLS.md
    style.ts                # Template STYLE.md
    memory.ts               # Template MEMORY.md
  utils/
    service.ts              # Setup systemd/launchd
```

## Dependencias

- `@clack/prompts` -- UI interativa no terminal (spinners, inputs, selects, confirms)
