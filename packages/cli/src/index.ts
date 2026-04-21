#!/usr/bin/env bun

/**
 * ForgeClaw npm bootstrap
 *
 * Este arquivo e o unico entry do pacote publicado em `forgeclaw` no npm.
 * Zero imports de @forgeclaw/core ou qualquer outro pacote interno —
 * roda ANTES das deps do monorepo existirem na maquina do usuario.
 *
 * Fluxo:
 * 1. Se rodando de dentro do monorepo (desenvolvimento), delega direto pro
 *    cli.ts no mesmo diretorio.
 * 2. Se rodando isolado (npx forgeclaw ... ou global install):
 *    - `update` → git pull em ~/.forgeclaw/src/ + bun install
 *    - qualquer outro comando → garante clone em ~/.forgeclaw/src/, roda
 *      bun install se ainda nao rodou, delega pro cli.ts dentro do clone.
 */

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const REPO_URL = 'https://github.com/Ecoupdigital/forgeclaw.git';
const SRC_DIR = join(homedir(), '.forgeclaw', 'src');

function findMonorepoRoot(): string | null {
  const here = dirname(fileURLToPath(import.meta.url));
  // src -> cli -> packages -> root  (3 levels up from __dirname)
  const monorepoRoot = resolve(here, '..', '..', '..');
  const coreMarker = join(monorepoRoot, 'packages', 'core', 'package.json');
  return existsSync(coreMarker) ? monorepoRoot : null;
}

function delegate(cwd: string | undefined, cliPath: string, args: string[]): never {
  const proc = spawnSync('bun', ['run', cliPath, ...args], {
    stdio: 'inherit',
    cwd,
  });
  process.exit(proc.status ?? 1);
}

function runCommand(label: string, cmd: string, argv: string[], cwd: string): void {
  console.log(`> ${label}`);
  const proc = spawnSync(cmd, argv, { stdio: 'inherit', cwd });
  if (proc.status !== 0) {
    console.error(`${label} failed (exit ${proc.status}).`);
    process.exit(proc.status ?? 1);
  }
}

async function ensureSrcCloned(): Promise<string> {
  const alreadyCloned = existsSync(join(SRC_DIR, 'package.json'));
  if (!alreadyCloned) {
    console.log(`Cloning ForgeClaw into ${SRC_DIR}...`);
    runCommand('git clone', 'git', ['clone', '--depth=1', REPO_URL, SRC_DIR], homedir());
  }
  // Rodar bun install sempre que node_modules do monorepo nao existe (primeira vez)
  if (!existsSync(join(SRC_DIR, 'node_modules'))) {
    runCommand('bun install', 'bun', ['install'], SRC_DIR);
  }
  return SRC_DIR;
}

async function runUpdate(): Promise<void> {
  if (!existsSync(join(SRC_DIR, '.git'))) {
    console.error(`${SRC_DIR} nao existe. Rode 'npx forgeclaw install' primeiro.`);
    process.exit(1);
  }
  runCommand('git pull', 'git', ['pull', '--ff-only'], SRC_DIR);
  runCommand('bun install', 'bun', ['install'], SRC_DIR);
  console.log('ForgeClaw atualizado. Rode `forgeclaw status` pra conferir.');
}

// -----------------------------------------------------------------
// Main
// -----------------------------------------------------------------
const args = process.argv.slice(2);
const command = args[0];

// `update` e especial: nao precisa delegar pro CLI real, trata aqui
if (command === 'update' && findMonorepoRoot() === null) {
  await runUpdate();
  process.exit(0);
}

// Modo desenvolvimento (monorepo local): delega direto pro cli.ts sem clone
const monorepoRoot = findMonorepoRoot();
if (monorepoRoot !== null) {
  const devCli = join(monorepoRoot, 'packages', 'cli', 'src', 'cli.ts');
  delegate(undefined, devCli, args);
}

// Modo producao (rodando via npx/global install): garante clone + delega
const srcDir = await ensureSrcCloned();
const realCli = join(srcDir, 'packages', 'cli', 'src', 'cli.ts');
if (!existsSync(realCli)) {
  console.error(`CLI real nao encontrado em ${realCli}. Repo corrompido? Tente deletar ${SRC_DIR} e rodar de novo.`);
  process.exit(1);
}
delegate(undefined, realCli, args);
