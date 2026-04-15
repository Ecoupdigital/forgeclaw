---
phase: 20-data-export-photo
plan: 20-01
type: feature
autonomous: true
wave: 0
depends_on: []
requirements: [MED-M5]
must_haves:
  truths:
    - "Running `forgeclaw export` creates a .tar.gz backup file in the current directory"
    - "The backup contains forgeclaw.db, forgeclaw.config.json, harness/, memory/, and .env"
    - "The CLI help output lists the export command"
  artifacts:
    - path: "packages/cli/src/commands/export.ts"
      provides: "Export command implementation"
    - path: "packages/cli/src/index.ts"
      provides: "CLI entrypoint with export command registered"
  key_links:
    - from: "packages/cli/src/index.ts"
      to: "packages/cli/src/commands/export.ts"
      via: "import { exportData } from './commands/export'"
---

# Fase 20 Plano 01: CLI Export/Backup Command

**Objetivo:** Adicionar comando `forgeclaw export` que cria um arquivo .tar.gz contendo todos os dados do usuario (db, config, harness, memory, .env) para backup/portabilidade.

## Contexto

@packages/cli/src/index.ts -- CLI entrypoint, switch/case para comandos, importa de ./commands/*
@packages/cli/src/commands/install.ts -- Referencia de como comandos funcionam: usa @clack/prompts, spinner, log
@packages/core/src/config.ts -- CONFIG_DIR = join(homedir(), '.forgeclaw'), CONFIG_PATH = join(CONFIG_DIR, 'forgeclaw.config.json')

## Tarefas

<task id="1" type="auto">
<files>packages/cli/src/commands/export.ts</files>
<action>
Criar o arquivo `packages/cli/src/commands/export.ts` com a seguinte implementacao:

```typescript
import { intro, spinner, outro, log } from '@clack/prompts'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
```

**Constantes:**
```typescript
const FORGECLAW_DIR = join(homedir(), '.forgeclaw')
```

**Funcao exportada: `export async function exportData(): Promise<void>`**

Passos da implementacao:

1. Chamar `intro('ForgeClaw Export')`.

2. Criar um spinner: `const s = spinner()`.

3. Definir a data atual formatada:
```typescript
const now = new Date()
const dateStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
const outputFile = join(process.cwd(), `forgeclaw-backup-${dateStr}.tar.gz`)
```

4. Verificar se `FORGECLAW_DIR` existe. Se nao:
```typescript
if (!existsSync(FORGECLAW_DIR)) {
  log.error(`ForgeClaw directory not found: ${FORGECLAW_DIR}`)
  log.info('Run "forgeclaw install" first.')
  process.exit(1)
}
```

5. Definir os itens a incluir no backup (paths relativos ao FORGECLAW_DIR):
```typescript
const items = [
  'db/forgeclaw.db',
  'forgeclaw.config.json',
  'harness',
  'memory',
  '.env',
]
```

6. Filtrar apenas os que existem:
```typescript
const existingItems = items.filter(item => existsSync(join(FORGECLAW_DIR, item)))
```

7. Se nenhum item existir:
```typescript
if (existingItems.length === 0) {
  log.error('No data found to export.')
  process.exit(1)
}
```

8. Logar quais itens serao incluidos:
```typescript
log.info(`Including ${existingItems.length} item(s):`)
for (const item of existingItems) {
  log.message(`  - ${item}`)
}
```

9. Criar o tar.gz usando `Bun.spawn`:
```typescript
s.start('Creating backup...')

const proc = Bun.spawn(
  ['tar', 'czf', outputFile, ...existingItems],
  {
    cwd: FORGECLAW_DIR,
    stdout: 'pipe',
    stderr: 'pipe',
  }
)

const stderr = await new Response(proc.stderr).text()
await proc.exited

if (proc.exitCode !== 0) {
  s.stop('Backup failed.')
  log.error(`tar failed: ${stderr}`)
  process.exit(1)
}
```

10. Obter o tamanho do arquivo gerado:
```typescript
const { statSync } = await import('node:fs')
const fileSize = statSync(outputFile).size
const sizeMB = (fileSize / (1024 * 1024)).toFixed(2)

s.stop('Backup created.')
```

11. Finalizar:
```typescript
outro(`Backup saved: ${outputFile} (${sizeMB} MB)`)
```

**NAO** incluir nenhuma logica de restore neste plano -- apenas export.
**NAO** usar nenhuma lib externa alem de @clack/prompts (ja e dependencia do CLI).
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && bun run packages/cli/src/commands/export.ts --help 2>&1 || echo "File created, checking syntax..." && bun build --target=bun packages/cli/src/commands/export.ts --outdir /tmp/forgeclaw-check 2>&1</automated>
</verify>
<done>Arquivo export.ts compila sem erros. A funcao exportData esta exportada e implementa todos os passos: verifica existencia do FORGECLAW_DIR, filtra itens existentes, roda tar czf, reporta tamanho do arquivo.</done>
</task>

<task id="2" type="auto">
<files>packages/cli/src/index.ts</files>
<action>
Modificar `packages/cli/src/index.ts` para registrar o comando export.

1. Adicionar import no topo (apos os imports existentes):
```typescript
import { exportData } from './commands/export'
```

2. Adicionar case no switch (antes do `default:`):
```typescript
case 'export':
  await exportData()
  break
```

3. Atualizar o texto de help na funcao `showHelp()` adicionando a linha do export na secao Commands:
```
    export      Create backup of all ForgeClaw data (.tar.gz)
```
Inserir entre a linha `status` e `logs` (ou ao final da lista de commands, a ordem nao e critica).

**Resultado final do switch deve ter:** install, update, uninstall, status, export, logs, default.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw && bun build --target=bun packages/cli/src/index.ts --outdir /tmp/forgeclaw-check-cli 2>&1 && echo "BUILD OK"</automated>
</verify>
<done>O CLI index.ts importa exportData, inclui case 'export', e showHelp lista o comando export.</done>
</task>

<task id="3" type="auto">
<files>packages/cli/src/commands/export.ts</files>
<action>
Testar o comando export end-to-end em ambiente real.

1. Executar o comando export:
```bash
cd /tmp && bun run /home/projects/ForgeClaw/packages/cli/src/index.ts export
```

2. Verificar que o arquivo foi criado:
```bash
ls -la /tmp/forgeclaw-backup-*.tar.gz
```

3. Verificar o conteudo do tar.gz:
```bash
tar tzf /tmp/forgeclaw-backup-*.tar.gz
```
Deve listar: db/forgeclaw.db, forgeclaw.config.json, harness/*, memory/*, .env (os que existirem).

4. Limpar o arquivo de teste:
```bash
rm -f /tmp/forgeclaw-backup-*.tar.gz
```

Se qualquer passo falhar, corrigir o codigo em export.ts ate que o teste passe.
</action>
<verify>
<automated>cd /tmp && bun run /home/projects/ForgeClaw/packages/cli/src/index.ts export 2>&1 && tar tzf /tmp/forgeclaw-backup-*.tar.gz 2>&1 && rm -f /tmp/forgeclaw-backup-*.tar.gz && echo "E2E OK"</automated>
</verify>
<done>O comando `forgeclaw export` cria um .tar.gz valido contendo os dados do ForgeClaw. O arquivo pode ser listado com tar tzf e contem os itens esperados.</done>
</task>

## Criterios de Sucesso

- [ ] `forgeclaw export` cria arquivo `forgeclaw-backup-YYYY-MM-DD.tar.gz` no diretorio atual
- [ ] O backup contem db/forgeclaw.db, forgeclaw.config.json, harness/, memory/, .env (os que existirem)
- [ ] O help do CLI lista o comando export
- [ ] O comando reporta tamanho do arquivo ao finalizar
