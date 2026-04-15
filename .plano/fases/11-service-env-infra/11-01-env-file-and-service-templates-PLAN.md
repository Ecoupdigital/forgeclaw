---
phase: 11-service-env-infra
plan: 11-01
type: feature
autonomous: true
wave: 0
depends_on: []
requirements: [PKG-B1, PKG-B2]
must_haves:
  truths:
    - "service.ts exports getSystemdDashboardUnit() que gera unit file para dashboard em production mode"
    - "service.ts exports getSystemdUnit() com EnvironmentFile apontando para ~/.forgeclaw/.env"
    - "service.ts exports getDashboardLaunchdPlist() para macOS"
    - "setupService instala AMBOS servicos (bot + dashboard) e retorna resultado combinado"
    - "Ambos services usam EnvironmentFile para carregar API keys"
  artifacts:
    - path: "packages/cli/src/utils/service.ts"
      provides: "Service templates com dashboard unit + EnvironmentFile em ambos services"
  key_links:
    - from: "service.ts getSystemdUnit()"
      to: "~/.forgeclaw/.env"
      via: "EnvironmentFile= directive no unit file"
    - from: "service.ts getSystemdDashboardUnit()"
      to: "packages/dashboard"
      via: "ExecStartPre=bun run build + ExecStart=bun run start"
---

# Fase 11 Plano 01: Env File e Service Templates

**Objetivo:** Refatorar `packages/cli/src/utils/service.ts` para: (1) adicionar dashboard service template em production mode, (2) adicionar `EnvironmentFile=` em ambos services para carregar API keys de `~/.forgeclaw/.env`, (3) instalar ambos services no `setupService()`.

## Contexto

@packages/cli/src/utils/service.ts -- Service setup atual (so bot, sem EnvironmentFile)
@ops/forgeclaw-dashboard.service -- Referencia de dashboard service (roda dev, nao production)
@packages/dashboard/package.json -- Scripts: build = "next build", start = "next start -p 4040"
@packages/core/src/voice-handler.ts -- Le process.env.GROQ_API_KEY e process.env.OPENAI_API_KEY

## Tarefas

<task id="1" type="auto">
<files>packages/cli/src/utils/service.ts</files>
<action>
Adicionar constantes para o dashboard service no topo do arquivo, logo apos as constantes existentes:

```typescript
const DASHBOARD_SERVICE_NAME = 'forgeclaw-dashboard'
const SYSTEMD_DASHBOARD_PATH = `/etc/systemd/system/${DASHBOARD_SERVICE_NAME}.service`
const LAUNCHD_DASHBOARD_LABEL = 'com.forgeclaw.dashboard'
const LAUNCHD_DASHBOARD_PATH = join(homedir(), 'Library', 'LaunchAgents', `${LAUNCHD_DASHBOARD_LABEL}.plist`)
```

Adicionar constante para o path do env file:

```typescript
const ENV_FILE_PATH = join(homedir(), '.forgeclaw', '.env')
```

Adicionar constante para o DASHBOARD_DIR resolvendo o path relativo ao CLI package (mesmo pattern do BOT_ENTRY):

```typescript
const DASHBOARD_DIR = resolve(__dirname, '..', '..', '..', 'dashboard')
```

NAO remover nenhuma constante existente.
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -c 'DASHBOARD_SERVICE_NAME\|ENV_FILE_PATH\|DASHBOARD_DIR' packages/cli/src/utils/service.ts | grep -q '3' && echo PASS || echo FAIL</automated></verify>
<done>As 6 novas constantes existem no arquivo: DASHBOARD_SERVICE_NAME, SYSTEMD_DASHBOARD_PATH, LAUNCHD_DASHBOARD_LABEL, LAUNCHD_DASHBOARD_PATH, ENV_FILE_PATH, DASHBOARD_DIR</done>
</task>

<task id="2" type="auto">
<files>packages/cli/src/utils/service.ts</files>
<action>
Modificar a funcao `getSystemdUnit()` existente para adicionar a diretiva `EnvironmentFile=` ANTES da linha `Environment=HOME=...`. A funcao deve ficar:

```typescript
function getSystemdUnit(): string {
  return `[Unit]
Description=ForgeClaw - Personal AI Command Center
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/bun run ${BOT_ENTRY}
Restart=always
RestartSec=5
EnvironmentFile=-${ENV_FILE_PATH}
Environment=HOME=${homedir()}
WorkingDirectory=${resolve(__dirname, '..', '..', '..', '..')}

[Install]
WantedBy=multi-user.target
`
}
```

IMPORTANTE: O `-` antes do path em `EnvironmentFile=-` significa "nao falhar se o arquivo nao existir". Isso e critico para backward compatibility -- o bot deve iniciar mesmo sem o env file.

NAO mudar nada alem de adicionar a linha EnvironmentFile.
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep 'EnvironmentFile=' packages/cli/src/utils/service.ts | head -1 | grep -q '\.forgeclaw/\.env' && echo PASS || echo FAIL</automated></verify>
<done>getSystemdUnit() contem `EnvironmentFile=-~/.forgeclaw/.env` (com dash para tolerancia a ausencia)</done>
</task>

<task id="3" type="auto">
<files>packages/cli/src/utils/service.ts</files>
<action>
Criar a funcao `getSystemdDashboardUnit()` logo apos `getSystemdUnit()`. Esta funcao gera o unit file para o dashboard Next.js em production mode.

```typescript
function getSystemdDashboardUnit(): string {
  return `[Unit]
Description=ForgeClaw Dashboard
After=forgeclaw.service
Requires=forgeclaw.service

[Service]
Type=simple
ExecStartPre=/usr/bin/bun run build
ExecStart=/usr/bin/bun run start
Restart=always
RestartSec=5
EnvironmentFile=-${ENV_FILE_PATH}
Environment=HOME=${homedir()}
Environment=NODE_ENV=production
WorkingDirectory=${DASHBOARD_DIR}

[Install]
WantedBy=multi-user.target
`
}
```

Detalhes criticos:
- `After=forgeclaw.service` + `Requires=forgeclaw.service` -- dashboard depende do bot (que inclui o WS server)
- `ExecStartPre=/usr/bin/bun run build` -- roda `next build` antes de start. Isso garante build atualizado ao iniciar/reiniciar
- `ExecStart=/usr/bin/bun run start` -- roda `next start -p 4040` (definido no package.json do dashboard)
- `WorkingDirectory=${DASHBOARD_DIR}` -- diretorio do dashboard (nao o root do monorepo)
- `NODE_ENV=production` -- Next.js em modo producao
- `EnvironmentFile=-${ENV_FILE_PATH}` -- mesmas env vars do bot (pode ter vars uteis futuras)
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -A 20 'getSystemdDashboardUnit' packages/cli/src/utils/service.ts | grep -q 'ExecStartPre.*bun run build' && echo PASS || echo FAIL</automated></verify>
<done>Funcao getSystemdDashboardUnit() existe, gera unit com ExecStartPre=build, ExecStart=start, EnvironmentFile, WorkingDirectory=dashboard, NODE_ENV=production</done>
</task>

<task id="4" type="auto">
<files>packages/cli/src/utils/service.ts</files>
<action>
Criar a funcao `getDashboardLaunchdPlist()` logo apos `getSystemdDashboardUnit()`. Esta funcao gera o plist para macOS.

```typescript
function getDashboardLaunchdPlist(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_DASHBOARD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/bun</string>
    <string>run</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>${DASHBOARD_DIR}</string>
  <key>StandardOutPath</key>
  <string>${join(homedir(), '.forgeclaw', 'logs', 'dashboard.log')}</string>
  <key>StandardErrorPath</key>
  <string>${join(homedir(), '.forgeclaw', 'logs', 'dashboard.err.log')}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>${homedir()}</string>
    <key>NODE_ENV</key>
    <string>production</string>
  </dict>
</dict>
</plist>
`
}
```

Tambem atualizar `getLaunchdPlist()` existente para adicionar env file loading. Como launchd nao suporta EnvironmentFile nativamente, NAO tentar replicar isso no plist do bot -- as env vars serao setadas no plist diretamente pelo installer (tarefa do plano 11-02). Por ora, manter getLaunchdPlist() como esta.

NOTA: No macOS, o dashboard precisa que `bun run build` seja executado manualmente antes do primeiro start (ou pelo installer). O plist nao tem equivalente a ExecStartPre. O installer cuidara disso.
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -c 'getDashboardLaunchdPlist' packages/cli/src/utils/service.ts | grep -q '[1-9]' && echo PASS || echo FAIL</automated></verify>
<done>Funcao getDashboardLaunchdPlist() existe, gera plist com WorkingDirectory=dashboard, NODE_ENV=production, logs separados</done>
</task>

<task id="5" type="auto">
<files>packages/cli/src/utils/service.ts</files>
<action>
Refatorar `setupSystemdService()` para instalar AMBOS services (bot + dashboard). A funcao atual instala apenas o bot. Modificar para:

```typescript
async function setupSystemdService(): Promise<ServiceResult> {
  try {
    // --- Bot service ---
    writeFileSync(SYSTEMD_PATH, getSystemdUnit())

    // --- Dashboard service ---
    writeFileSync(SYSTEMD_DASHBOARD_PATH, getSystemdDashboardUnit())

    // --- Reload systemd ---
    const reload = await runCommand(['systemctl', 'daemon-reload'])
    if (reload.exitCode !== 0) {
      return { success: false, message: `Failed to reload systemd: ${reload.stderr}` }
    }

    // --- Enable both ---
    const enableBot = await runCommand(['systemctl', 'enable', SERVICE_NAME])
    if (enableBot.exitCode !== 0) {
      return { success: false, message: `Failed to enable bot service: ${enableBot.stderr}` }
    }

    const enableDash = await runCommand(['systemctl', 'enable', DASHBOARD_SERVICE_NAME])
    if (enableDash.exitCode !== 0) {
      return { success: false, message: `Failed to enable dashboard service: ${enableDash.stderr}` }
    }

    // --- Start both (bot first, dashboard depends on it) ---
    const startBot = await runCommand(['systemctl', 'start', SERVICE_NAME])
    if (startBot.exitCode !== 0) {
      return { success: false, message: `Failed to start bot service: ${startBot.stderr}` }
    }

    const startDash = await runCommand(['systemctl', 'start', DASHBOARD_SERVICE_NAME])
    if (startDash.exitCode !== 0) {
      // Bot started fine, dashboard failed -- report partial success
      return { success: true, message: `Bot service started. Dashboard failed to start: ${startDash.stderr}` }
    }

    return { success: true, message: 'Bot and Dashboard services installed and started.' }
  } catch (err) {
    return { success: false, message: `Service setup failed: ${err}. Try running with sudo.` }
  }
}
```

Logica critica:
- Escrever AMBOS unit files antes de daemon-reload (uma unica reload)
- Enable ambos
- Start bot primeiro, depois dashboard (dashboard depende do bot via After/Requires)
- Se dashboard falhar, reportar sucesso parcial (bot esta rodando)
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -c 'DASHBOARD_SERVICE_NAME\|SYSTEMD_DASHBOARD_PATH' packages/cli/src/utils/service.ts | grep -q '[4-9]' && echo PASS || echo FAIL</automated></verify>
<done>setupSystemdService() escreve ambos unit files, faz um unico daemon-reload, enable e start ambos services com tratamento de erro granular</done>
</task>

<task id="6" type="auto">
<files>packages/cli/src/utils/service.ts</files>
<action>
Refatorar `setupLaunchdService()` para instalar AMBOS services no macOS:

```typescript
async function setupLaunchdService(): Promise<ServiceResult> {
  try {
    const agentDir = join(homedir(), 'Library', 'LaunchAgents')
    mkdirSync(agentDir, { recursive: true })

    // --- Bot plist ---
    writeFileSync(LAUNCHD_PATH, getLaunchdPlist())

    const loadBot = await runCommand(['launchctl', 'load', LAUNCHD_PATH])
    if (loadBot.exitCode !== 0) {
      return { success: false, message: `Failed to load bot launchd service: ${loadBot.stderr}` }
    }

    // --- Dashboard plist ---
    writeFileSync(LAUNCHD_DASHBOARD_PATH, getDashboardLaunchdPlist())

    const loadDash = await runCommand(['launchctl', 'load', LAUNCHD_DASHBOARD_PATH])
    if (loadDash.exitCode !== 0) {
      return { success: true, message: `Bot service started. Dashboard failed to load: ${loadDash.stderr}` }
    }

    return { success: true, message: 'Bot and Dashboard services installed and started.' }
  } catch (err) {
    return { success: false, message: `Service setup failed: ${err}` }
  }
}
```

Tambem atualizar `stopService()` para parar ambos:

```typescript
export async function stopService(): Promise<ServiceResult> {
  const platform = process.platform
  if (platform === 'linux') {
    await runCommand(['systemctl', 'stop', DASHBOARD_SERVICE_NAME])
    const result = await runCommand(['systemctl', 'stop', SERVICE_NAME])
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? 'Services stopped.' : `Failed to stop: ${result.stderr}`,
    }
  } else if (platform === 'darwin') {
    await runCommand(['launchctl', 'stop', LAUNCHD_DASHBOARD_LABEL])
    const result = await runCommand(['launchctl', 'stop', LAUNCHD_LABEL])
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? 'Services stopped.' : `Failed to stop: ${result.stderr}`,
    }
  }
  return { success: false, message: 'Unsupported platform.' }
}
```

Atualizar `startService()` para iniciar ambos (bot primeiro):

```typescript
export async function startService(): Promise<ServiceResult> {
  const platform = process.platform
  if (platform === 'linux') {
    const botResult = await runCommand(['systemctl', 'start', SERVICE_NAME])
    if (botResult.exitCode !== 0) {
      return { success: false, message: `Failed to start bot: ${botResult.stderr}` }
    }
    const dashResult = await runCommand(['systemctl', 'start', DASHBOARD_SERVICE_NAME])
    return {
      success: true,
      message: dashResult.exitCode === 0 ? 'Services started.' : `Bot started. Dashboard failed: ${dashResult.stderr}`,
    }
  } else if (platform === 'darwin') {
    const botResult = await runCommand(['launchctl', 'start', LAUNCHD_LABEL])
    if (botResult.exitCode !== 0) {
      return { success: false, message: `Failed to start bot: ${botResult.stderr}` }
    }
    const dashResult = await runCommand(['launchctl', 'start', LAUNCHD_DASHBOARD_LABEL])
    return {
      success: true,
      message: dashResult.exitCode === 0 ? 'Services started.' : `Bot started. Dashboard failed: ${dashResult.stderr}`,
    }
  }
  return { success: false, message: 'Unsupported platform.' }
}
```

Atualizar `removeService()` para remover ambos:

```typescript
export async function removeService(): Promise<ServiceResult> {
  const platform = process.platform
  if (platform === 'linux') {
    // Dashboard first
    await runCommand(['systemctl', 'disable', DASHBOARD_SERVICE_NAME])
    if (existsSync(SYSTEMD_DASHBOARD_PATH)) {
      unlinkSync(SYSTEMD_DASHBOARD_PATH)
    }
    // Bot
    await runCommand(['systemctl', 'disable', SERVICE_NAME])
    if (existsSync(SYSTEMD_PATH)) {
      unlinkSync(SYSTEMD_PATH)
    }
    await runCommand(['systemctl', 'daemon-reload'])
    return { success: true, message: 'Bot and Dashboard services removed.' }
  } else if (platform === 'darwin') {
    // Dashboard
    if (existsSync(LAUNCHD_DASHBOARD_PATH)) {
      await runCommand(['launchctl', 'unload', LAUNCHD_DASHBOARD_PATH])
      unlinkSync(LAUNCHD_DASHBOARD_PATH)
    }
    // Bot
    if (existsSync(LAUNCHD_PATH)) {
      await runCommand(['launchctl', 'unload', LAUNCHD_PATH])
      unlinkSync(LAUNCHD_PATH)
    }
    return { success: true, message: 'Bot and Dashboard services removed.' }
  }
  return { success: false, message: 'Unsupported platform.' }
}
```

Atualizar `isServiceRunning()` para retornar status de ambos (opcional -- pode manter so bot, mas preferivel retornar um objeto). Para backward compatibility, manter retornando boolean baseado no bot, mas logar dashboard:

NAO mudar a assinatura de `isServiceRunning()` -- manter retornando boolean (true se bot ativo). Isso evita breaking changes em quem usa essa funcao.
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -c 'DASHBOARD' packages/cli/src/utils/service.ts | xargs test 8 -le && echo PASS || echo FAIL</automated></verify>
<done>setupLaunchdService(), startService(), stopService(), removeService() todos gerenciam ambos services (bot + dashboard)</done>
</task>

<task id="7" type="auto">
<files>packages/cli/src/utils/service.ts</files>
<action>
Adicionar funcao exportada `writeEnvFile()` que cria `~/.forgeclaw/.env` com as API keys. Esta funcao sera chamada pelo installer (plano 11-02).

```typescript
export function writeEnvFile(config: { openaiApiKey?: string | null; groqApiKey?: string | null }): void {
  const lines: string[] = []

  if (config.openaiApiKey) {
    lines.push(`OPENAI_API_KEY=${config.openaiApiKey}`)
  }

  if (config.groqApiKey) {
    lines.push(`GROQ_API_KEY=${config.groqApiKey}`)
  }

  if (lines.length === 0) {
    // No keys to write, skip creating env file
    return
  }

  const content = lines.join('\n') + '\n'
  writeFileSync(ENV_FILE_PATH, content)
  chmodSync(ENV_FILE_PATH, 0o600) // Restrictive permissions -- only owner can read
}
```

Imports necessarios: adicionar `chmodSync` ao import de `node:fs` existente (ja importa writeFileSync, existsSync, unlinkSync, mkdirSync -- adicionar chmodSync).

A funcao:
1. Recebe objeto com openaiApiKey e groqApiKey (opcionais/nullable)
2. Gera conteudo no formato `KEY=value` (formato padrao de env file)
3. Escreve em ~/.forgeclaw/.env com permissoes 0o600
4. Se nenhuma key fornecida, nao cria arquivo (noop)
5. Sobrescreve arquivo existente se houver (update mode do installer)

NAO colocar aspas nos valores -- systemd EnvironmentFile le valores sem aspas corretamente. Aspas causam problemas em alguns parsers.
</action>
<verify><automated>cd /home/projects/ForgeClaw && grep -c 'writeEnvFile\|ENV_FILE_PATH\|chmodSync' packages/cli/src/utils/service.ts | grep -q '[3-9]' && echo PASS || echo FAIL</automated></verify>
<done>Funcao writeEnvFile() exportada, cria ~/.forgeclaw/.env com API keys e permissoes 0o600, noop se sem keys</done>
</task>

## Criterios de Sucesso

- [ ] `getSystemdUnit()` contem `EnvironmentFile=-~/.forgeclaw/.env`
- [ ] `getSystemdDashboardUnit()` existe com ExecStartPre=build, ExecStart=start, NODE_ENV=production
- [ ] `getDashboardLaunchdPlist()` existe com WorkingDirectory=dashboard
- [ ] `setupSystemdService()` instala e inicia bot + dashboard
- [ ] `setupLaunchdService()` instala e inicia bot + dashboard
- [ ] `startService()`, `stopService()`, `removeService()` gerenciam ambos services
- [ ] `writeEnvFile()` cria .env com permissoes restritivas
- [ ] Backward compatibility mantida (isServiceRunning retorna boolean, EnvironmentFile usa dash prefix)
