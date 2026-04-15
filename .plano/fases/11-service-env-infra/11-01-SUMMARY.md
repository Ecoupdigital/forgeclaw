# 11-01 Summary: Env File e Service Templates

**Status:** DONE
**Arquivo modificado:** `packages/cli/src/utils/service.ts`

## Tarefas Executadas

### Task 1 - Constantes do dashboard e env file
- Adicionadas 6 constantes: `DASHBOARD_SERVICE_NAME`, `SYSTEMD_DASHBOARD_PATH`, `LAUNCHD_DASHBOARD_LABEL`, `LAUNCHD_DASHBOARD_PATH`, `ENV_FILE_PATH`, `DASHBOARD_DIR`
- Nenhuma constante existente removida

### Task 2 - EnvironmentFile no bot systemd unit
- Adicionada diretiva `EnvironmentFile=-${ENV_FILE_PATH}` em `getSystemdUnit()` antes de `Environment=HOME=...`
- Dash prefix garante que bot inicia mesmo sem o .env

### Task 3 - getSystemdDashboardUnit()
- Nova funcao que gera unit file para dashboard Next.js em production
- Inclui: `ExecStartPre=/usr/bin/bun run build`, `ExecStart=/usr/bin/bun run start`, `NODE_ENV=production`
- Depende de `forgeclaw.service` via After/Requires
- WorkingDirectory aponta para o diretorio do dashboard

### Task 4 - getDashboardLaunchdPlist()
- Nova funcao que gera plist macOS para dashboard
- WorkingDirectory=dashboard, NODE_ENV=production
- Logs separados: dashboard.log e dashboard.err.log

### Task 5 - setupSystemdService() dual-service
- Escreve ambos unit files antes de um unico daemon-reload
- Enable e start ambos services (bot primeiro)
- Sucesso parcial reportado se dashboard falhar mas bot iniciar

### Task 6 - Lifecycle functions dual-service
- `setupLaunchdService()`: instala ambos plists
- `startService()`: inicia bot primeiro, depois dashboard (ambas plataformas)
- `stopService()`: para dashboard primeiro, depois bot (ambas plataformas)
- `removeService()`: remove dashboard primeiro, depois bot, unico daemon-reload
- `isServiceRunning()`: mantida inalterada (retorna boolean do bot) para backward compatibility

### Task 7 - writeEnvFile()
- Nova funcao exportada que cria `~/.forgeclaw/.env` com OPENAI_API_KEY e GROQ_API_KEY
- Permissoes 0o600 (somente owner le)
- No-op se nenhuma key fornecida
- Import de `chmodSync` adicionado

## Verificacao Funcional

- Todas as 7 constantes/funcoes verificadas via grep counts
- Arquivo transpila com sucesso via `bun build` (16ms, sem erros de sintaxe)
- 7 commits atomicos criados, um por tarefa

## Commits

1. `393f247` feat(cli): add dashboard service and env file constants
2. `f2b0f27` feat(cli): add EnvironmentFile directive to bot systemd unit
3. `1f4bdeb` feat(cli): add getSystemdDashboardUnit() for production dashboard
4. `20cda47` feat(cli): add getDashboardLaunchdPlist() for macOS dashboard service
5. `57f508b` feat(cli): setupSystemdService installs both bot and dashboard
6. `8f40072` feat(cli): all service lifecycle functions manage bot + dashboard
7. `b6406a1` feat(cli): add writeEnvFile() for ~/.forgeclaw/.env with API keys
