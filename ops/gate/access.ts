#!/usr/bin/env bun
/**
 * ForgeClaw Access Gate v1
 *
 * CLI para conceder/revogar acesso ao repo privado Ecoupdigital/forgeclaw
 * para membros da comunidade Dominando AutoIA.
 *
 * Comandos:
 *   grant   <github-username> [--member-email=<email>] [--note=<texto>]
 *   revoke  <github-username> [--reason=<texto>]
 *   list    [--format=table|json]
 *   audit   [--tail=N]
 *
 * Exemplos:
 *   bun run ops/gate/access.ts grant jonathanrenan --member-email=jonathan@foo.com
 *   bun run ops/gate/access.ts revoke olduser --reason="subscription cancelled"
 *   bun run ops/gate/access.ts list
 *   bun run ops/gate/access.ts audit --tail=20
 */

import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir, userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';

// ----------------- CONFIG -----------------

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(SCRIPT_DIR, 'access-log.jsonl');
const MEMBERS_PATH = join(SCRIPT_DIR, 'members.jsonl');
const LOCAL_ENV_PATH = join(SCRIPT_DIR, 'gate.env');
const HOME_ENV_PATH = join(homedir(), '.forgeclaw', 'gate.env');

interface GateConfig {
  token: string;
  owner: string;
  repo: string;
  permission: 'pull' | 'triage' | 'push' | 'maintain' | 'admin';
}

function parseDotenv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadConfig(): GateConfig {
  // Precedencia: process.env > ops/gate/gate.env > ~/.forgeclaw/gate.env
  const env: Record<string, string> = {};
  for (const p of [HOME_ENV_PATH, LOCAL_ENV_PATH]) {
    if (existsSync(p)) {
      Object.assign(env, parseDotenv(readFileSync(p, 'utf-8')));
    }
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) env[k] = v;
  }

  const token = env.GITHUB_TOKEN;
  const owner = env.REPO_OWNER || 'Ecoupdigital';
  const repo = env.REPO_NAME || 'forgeclaw';
  const permission = (env.DEFAULT_PERMISSION || 'pull') as GateConfig['permission'];

  if (!token) {
    console.error('ERROR: GITHUB_TOKEN nao configurado.');
    console.error('  Defina via process.env, ops/gate/gate.env, ou ~/.forgeclaw/gate.env.');
    console.error('  Ver ops/gate/gate.env.example para template.');
    process.exit(2);
  }
  if (!['pull', 'triage', 'push', 'maintain', 'admin'].includes(permission)) {
    console.error(`ERROR: DEFAULT_PERMISSION invalida: ${permission}`);
    process.exit(2);
  }
  return { token, owner, repo, permission };
}

// ----------------- LOG -----------------

interface LogEntry {
  ts: string;                  // ISO timestamp
  actor: string;               // quem rodou (os.userInfo().username)
  action: 'grant' | 'revoke' | 'list' | 'audit';
  target?: string;             // github username afetado
  result: 'ok' | 'noop' | 'error';
  status_code?: number;        // HTTP status da API do GitHub
  message?: string;
  meta?: Record<string, unknown>;
}

function logAction(entry: LogEntry): void {
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf-8');
}

function getActor(): string {
  try {
    return userInfo().username || 'unknown';
  } catch {
    return 'unknown';
  }
}

// ----------------- GITHUB CLIENT -----------------

async function ghFetch(cfg: GateConfig, path: string, init: RequestInit = {}): Promise<Response> {
  const url = `https://api.github.com${path}`;
  const headers = {
    Authorization: `Bearer ${cfg.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'forgeclaw-access-gate/1.0',
    ...(init.headers || {}),
  };
  return fetch(url, { ...init, headers });
}

// ----------------- COMMANDS -----------------

async function cmdGrant(username: string, flags: Record<string, string>): Promise<number> {
  if (!username || !/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
    console.error('ERROR: github-username invalido (esperado: 1-39 chars [a-zA-Z0-9-]).');
    logAction({ ts: new Date().toISOString(), actor: getActor(), action: 'grant', target: username, result: 'error', message: 'invalid username' });
    return 2;
  }
  const cfg = loadConfig();

  const res = await ghFetch(cfg, `/repos/${cfg.owner}/${cfg.repo}/collaborators/${username}`, {
    method: 'PUT',
    body: JSON.stringify({ permission: cfg.permission }),
  });

  const actor = getActor();
  const ts = new Date().toISOString();

  if (res.status === 201) {
    // Convite enviado (usuario ainda nao aceitou)
    console.log(`OK: convite enviado para @${username} (permission=${cfg.permission}).`);
    logAction({ ts, actor, action: 'grant', target: username, result: 'ok', status_code: 201, message: 'invite sent', meta: flags });
    appendFileSync(MEMBERS_PATH, JSON.stringify({
      ts, github_username: username, member_email: flags['member-email'] || null, note: flags.note || null, status: 'invited',
    }) + '\n', 'utf-8');
    return 0;
  }
  if (res.status === 204) {
    console.log(`OK: @${username} ja era collaborator, permissao atualizada para ${cfg.permission}.`);
    logAction({ ts, actor, action: 'grant', target: username, result: 'noop', status_code: 204, message: 'already collaborator', meta: flags });
    return 0;
  }
  const body = await res.text();
  console.error(`ERROR ${res.status}: ${body}`);
  logAction({ ts, actor, action: 'grant', target: username, result: 'error', status_code: res.status, message: body.slice(0, 300), meta: flags });
  return 1;
}

async function cmdRevoke(username: string, flags: Record<string, string>): Promise<number> {
  if (!username || !/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
    console.error('ERROR: github-username invalido.');
    logAction({ ts: new Date().toISOString(), actor: getActor(), action: 'revoke', target: username, result: 'error', message: 'invalid username' });
    return 2;
  }
  const cfg = loadConfig();
  const res = await ghFetch(cfg, `/repos/${cfg.owner}/${cfg.repo}/collaborators/${username}`, {
    method: 'DELETE',
  });
  const actor = getActor();
  const ts = new Date().toISOString();

  if (res.status === 204) {
    console.log(`OK: @${username} removido do repo ${cfg.owner}/${cfg.repo}.`);
    logAction({ ts, actor, action: 'revoke', target: username, result: 'ok', status_code: 204, message: 'removed', meta: flags });
    return 0;
  }
  if (res.status === 404) {
    console.log(`NOOP: @${username} nao era collaborator (nada a fazer).`);
    logAction({ ts, actor, action: 'revoke', target: username, result: 'noop', status_code: 404, message: 'not a collaborator', meta: flags });
    return 0;
  }
  const body = await res.text();
  console.error(`ERROR ${res.status}: ${body}`);
  logAction({ ts, actor, action: 'revoke', target: username, result: 'error', status_code: res.status, message: body.slice(0, 300), meta: flags });
  return 1;
}

interface Collaborator {
  login: string;
  permissions?: { pull?: boolean; triage?: boolean; push?: boolean; maintain?: boolean; admin?: boolean };
  role_name?: string;
}

async function cmdList(flags: Record<string, string>): Promise<number> {
  const cfg = loadConfig();
  // Paginacao: per_page=100, affiliation=direct (so os que foram adicionados diretamente, nao members da org)
  const all: Collaborator[] = [];
  let page = 1;
  while (true) {
    const res = await ghFetch(cfg, `/repos/${cfg.owner}/${cfg.repo}/collaborators?affiliation=direct&per_page=100&page=${page}`);
    if (!res.ok) {
      console.error(`ERROR ${res.status}: ${await res.text()}`);
      return 1;
    }
    const batch = (await res.json()) as Collaborator[];
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
    if (page > 50) { console.error('Seguranca: paginacao > 50. Abortando.'); break; }
  }
  if (flags.format === 'json') {
    console.log(JSON.stringify(all, null, 2));
  } else {
    console.log(`Collaborators diretos de ${cfg.owner}/${cfg.repo}:`);
    for (const c of all) {
      console.log(`  @${c.login}  (role=${c.role_name || 'unknown'})`);
    }
    console.log(`Total: ${all.length}`);
  }
  logAction({ ts: new Date().toISOString(), actor: getActor(), action: 'list', result: 'ok', meta: { count: all.length } });
  return 0;
}

function cmdAudit(flags: Record<string, string>): number {
  if (!existsSync(LOG_PATH)) {
    console.log('(log vazio — nenhuma acao registrada ainda)');
    return 0;
  }
  const raw = readFileSync(LOG_PATH, 'utf-8');
  const lines = raw.split('\n').filter(Boolean);
  const tailN = flags.tail ? parseInt(flags.tail, 10) : 50;
  const view = lines.slice(-tailN);
  for (const line of view) {
    try {
      const e = JSON.parse(line) as LogEntry;
      const target = e.target ? `@${e.target}` : '-';
      console.log(`${e.ts}  ${e.actor.padEnd(12)}  ${e.action.padEnd(7)}  ${target.padEnd(20)}  ${e.result.padEnd(5)}  ${e.message || ''}`);
    } catch {
      console.log(`[malformed] ${line}`);
    }
  }
  return 0;
}

// ----------------- MAIN -----------------

function parseArgs(argv: string[]): { cmd: string; positional: string[]; flags: Record<string, string> } {
  const [, , cmd, ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (const arg of rest) {
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq > 0) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        flags[arg.slice(2)] = 'true';
      }
    } else {
      positional.push(arg);
    }
  }
  return { cmd: cmd || '', positional, flags };
}

function printUsage(): void {
  console.log(`ForgeClaw Access Gate v1

Usage:
  bun run ops/gate/access.ts <command> [args]

Commands:
  grant <github-username> [--member-email=<email>] [--note=<text>]
  revoke <github-username> [--reason=<text>]
  list [--format=table|json]
  audit [--tail=N]

Env:
  GITHUB_TOKEN     required — PAT com escopo de administrar o repo
  REPO_OWNER       default: Ecoupdigital
  REPO_NAME        default: forgeclaw
  DEFAULT_PERMISSION default: pull`);
}

async function main(): Promise<void> {
  const { cmd, positional, flags } = parseArgs(process.argv);
  let code = 0;
  switch (cmd) {
    case 'grant':
      code = await cmdGrant(positional[0] ?? '', flags);
      break;
    case 'revoke':
      code = await cmdRevoke(positional[0] ?? '', flags);
      break;
    case 'list':
      code = await cmdList(flags);
      break;
    case 'audit':
      code = cmdAudit(flags);
      break;
    case '':
    case 'help':
    case '--help':
    case '-h':
      printUsage();
      break;
    default:
      console.error(`Comando desconhecido: ${cmd}`);
      printUsage();
      code = 2;
  }
  process.exit(code);
}

main().catch((err) => {
  console.error('FATAL:', err);
  logAction({ ts: new Date().toISOString(), actor: getActor(), action: 'grant', result: 'error', message: String(err?.message || err) });
  process.exit(1);
});
