#!/usr/bin/env bun
// scripts/audit-personal-context.ts
// Scanner deterministico de contexto pessoal no repo ForgeClaw.
// Uso: bun run scripts/audit-personal-context.ts [--json] [--out=<path>] [--ci]
//
// Entrada do plano 23-01: varre todo o repo (exceto ruido / pastas ignoradas)
// e detecta PII / paths hardcoded / handles / clientes privados / tokens.
// Saida: markdown (default) ou JSON (--json).
//
// Modos:
//   (default)  Emite markdown em stdout (ou arquivo com --out=<path>). Exit 0.
//   --json     Emite JSON em stdout (ou arquivo com --out=<path>). Exit 0.
//   --ci       Gate de CI (plano 23-03): aplica `.audit-personal-allowlist.txt`,
//              exit 0 se zero findings `critical` em codigo distribuido,
//              exit 1 listando os findings que quebraram o gate. Nao emite
//              markdown/json.
//
// Exit 1 tambem em erro fatal de IO (tanto no modo default quanto --ci).
//
// Zero dependencias novas — so node:fs/promises e node:path.

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';

const REPO_ROOT = process.cwd(); // espera-se rodar da raiz do repo

// Pastas ignoradas SEMPRE (ruido puro)
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  'coverage',
  // .playwright-mcp e alvo do plano 23-02 (delecao). O scanner NAO
  // vasculha dentro (evita poluir findings com KB de HTML/yml), apenas
  // registra a existencia do diretorio como 1 finding critical.
  '.playwright-mcp',
  '.gitnexus',
]);

// Arquivos ignorados por nome — principalmente outputs do proprio scanner,
// que senao criam loop de auto-referencia (o markdown do report cita
// literalmente todos os snippets e regexes encontrados).
// Tambem ignora o proprio scanner: os regex literais nele (ex: /jonathan/gi)
// batem com os proprios patterns, produzindo self-match. Esperado e nao PII.
const IGNORE_FILE_NAMES = new Set([
  'AUDIT-REPORT.md',
  'CLEANUP-CHECKLIST.md',
  'COVERAGE-VALIDATION.md',
  'audit-personal-context.ts',
]);

// Extensoes que valem ler. Arquivos sem extensao (LICENSE, Dockerfile,
// .service, .env) tambem entram — tratado no walker.
const TEXT_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.md', '.mdx',
  '.json', '.yml', '.yaml', '.service', '.toml',
  '.html', '.css', '.sh', '.env', '.example',
]);

type Category =
  | 'personal_name'
  | 'personal_company'
  | 'personal_client'
  | 'personal_handle'
  | 'personal_userid'
  | 'hardcoded_path'
  | 'private_repo_url'
  | 'private_skill_dep'
  | 'vault_structure'
  | 'playwright_snapshot'
  | 'bot_token_fragment';

interface Finding {
  file: string;           // path relativo ao REPO_ROOT
  line: number;           // 1-based; 0 = finding nao-textual (ex: presenca de diretorio)
  category: Category;
  pattern: string;        // regex que deu match (source) ou marcador
  snippet: string;        // contexto truncado 200 chars
  severity: 'critical' | 'high' | 'medium' | 'low';
}

// Categorias + severidade + regex.
// Patterns conservadores — preferem false-positive a false-negative.
// O relator classifica, o humano decide no plano 23-02.
const RULES: Array<{ category: Category; severity: Finding['severity']; pattern: RegExp }> = [
  // personal_name
  { category: 'personal_name', severity: 'critical', pattern: /\bJonathan\s+Renan\b/gi },
  { category: 'personal_name', severity: 'critical', pattern: /\bJonathan\b/g },
  { category: 'personal_name', severity: 'high',     pattern: /\bdra\s+nathalia\b/gi },

  // personal_company
  { category: 'personal_company', severity: 'critical', pattern: /\bEcoUp\b/g },
  { category: 'personal_company', severity: 'critical', pattern: /\bEcoupdigital\b/gi },
  { category: 'personal_company', severity: 'high',     pattern: /\becoup\.digital\b/gi },

  // personal_client — nomes de clientes/projetos do Jonathan
  { category: 'personal_client', severity: 'critical', pattern: /\b(lfpro|LFpro|LF\s?Pro|gestor-lfpro)\b/g },
  { category: 'personal_client', severity: 'critical', pattern: /\b(kovvy|Kovvy|clearify|Clearify)\b/g },
  { category: 'personal_client', severity: 'critical', pattern: /\b(don[\s-]?vicente)\b/gi },
  { category: 'personal_client', severity: 'critical', pattern: /\b(bv-otica|bv_otica|BV\s?[OÓ]tica)\b/gi },
  { category: 'personal_client', severity: 'critical', pattern: /\b(foco-real|focoreal)\b/gi },
  { category: 'personal_client', severity: 'critical', pattern: /\b(velhos-parceiros|velhos_parceiros)\b/gi },
  { category: 'personal_client', severity: 'high',     pattern: /\b(passini|mybrows|transplant|enove)\b/gi },

  // personal_handle
  { category: 'personal_handle', severity: 'critical', pattern: /@ForgeClawUP_bot/g },
  { category: 'personal_handle', severity: 'high',     pattern: /@jonathanrenan\.ia/g },

  // personal_userid — id do Jonathan e do grupo anonymous bot
  { category: 'personal_userid', severity: 'critical', pattern: /\b450030767\b/g },
  { category: 'personal_userid', severity: 'high',     pattern: /\b1087968824\b/g },

  // hardcoded_path — paths que so existem na maquina do Jonathan
  { category: 'hardcoded_path', severity: 'critical', pattern: /\/home\/vault\b/g },
  // /home/projects/X (outros projetos privados)
  { category: 'hardcoded_path', severity: 'high',     pattern: /\/home\/projects\/(?!ForgeClaw\b)[A-Za-z0-9_-]+/g },
  // /home/projects/ForgeClaw presente em systemd — precisa ser parametrizado
  { category: 'hardcoded_path', severity: 'high',     pattern: /\/home\/projects\/ForgeClaw\b/g },
  { category: 'hardcoded_path', severity: 'medium',   pattern: /\/root\/projects\b/g },
  { category: 'hardcoded_path', severity: 'medium',   pattern: /\/root\/obsidian\b/g },

  // private_repo_url
  { category: 'private_repo_url', severity: 'critical', pattern: /github\.com\/Ecoupdigital\/forgeclaw/gi },

  // private_skill_dep — acoplamento a skills / ferramentas pessoais
  { category: 'private_skill_dep', severity: 'high',   pattern: /\basaas[-_]?(api|mcp)\b/gi },
  { category: 'private_skill_dep', severity: 'high',   pattern: /\buazapi[-_]?(mcp)?\b/gi },
  { category: 'private_skill_dep', severity: 'high',   pattern: /\bconta[-_]?azul\b/gi },
  { category: 'private_skill_dep', severity: 'medium', pattern: /~\/\.claude\/skills\b/g },

  // vault_structure — estrutura especifica do vault do Jonathan
  { category: 'vault_structure', severity: 'high',   pattern: /05-pessoal\/daily-log/g },
  { category: 'vault_structure', severity: 'medium', pattern: /\b0\d-(inbox|projetos|clientes|skills|empresa|pessoal|conte[uú]do|conhecimentos)\b/gi },

  // bot_token_fragment — prefixo de token exposto
  { category: 'bot_token_fragment', severity: 'critical', pattern: /\b8662287719:/g },
  // pattern generico de bot token (id_numerico:alfanum)
  { category: 'bot_token_fragment', severity: 'medium',   pattern: /\b\d{9,10}:[A-Za-z0-9_-]{10,}/g },
];

async function walk(dir: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    console.error(`[audit] falha abrindo ${dir}:`, err);
    return;
  }
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, out);
    } else if (e.isFile()) {
      if (IGNORE_FILE_NAMES.has(e.name)) continue;
      const ext = extname(e.name).toLowerCase();
      // Arquivos sem extensao sao incluidos (LICENSE, .service, Dockerfile, etc)
      if (TEXT_EXTS.has(ext) || !ext) {
        let st;
        try {
          st = await stat(full);
        } catch {
          continue;
        }
        if (st.size <= 5_000_000) out.push(full);
      }
    }
  }
}

async function scanFile(abs: string): Promise<Finding[]> {
  const rel = relative(REPO_ROOT, abs);
  let content: string;
  try {
    content = await readFile(abs, 'utf-8');
  } catch (err) {
    console.error(`[audit] falha lendo ${abs}:`, err);
    return [];
  }
  const lines = content.split('\n');
  const findings: Finding[] = [];
  for (const rule of RULES) {
    // reset defensivo do lastIndex antes de iterar linhas
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      rule.pattern.lastIndex = 0;
      if (rule.pattern.global) {
        let m: RegExpExecArray | null;
        while ((m = rule.pattern.exec(line)) !== null) {
          findings.push({
            file: rel,
            line: i + 1,
            category: rule.category,
            pattern: rule.pattern.source,
            snippet: line.trim().slice(0, 200),
            severity: rule.severity,
          });
          // proteca contra infinite loop em zero-width match
          if (m.index === rule.pattern.lastIndex) rule.pattern.lastIndex++;
        }
      } else {
        if (rule.pattern.test(line)) {
          findings.push({
            file: rel,
            line: i + 1,
            category: rule.category,
            pattern: rule.pattern.source,
            snippet: line.trim().slice(0, 200),
            severity: rule.severity,
          });
        }
      }
    }
  }
  return findings;
}

async function registerPlaywrightDir(out: Finding[]): Promise<void> {
  const playDir = join(REPO_ROOT, '.playwright-mcp');
  try {
    const st = await stat(playDir);
    if (st.isDirectory()) {
      const entries = await readdir(playDir);
      out.push({
        file: '.playwright-mcp/',
        line: 0,
        category: 'playwright_snapshot',
        pattern: 'directory_presence',
        snippet: `diretorio contem ${entries.length} snapshots de sessoes do dashboard (dados reais)`,
        severity: 'critical',
      });
    }
  } catch {
    /* dir nao existe, tudo bem */
  }
}

const SEV_ORDER: Record<Finding['severity'], number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

function renderMarkdown(all: Finding[], filesCount: number): string {
  const byFile = new Map<string, Finding[]>();
  for (const f of all) {
    const arr = byFile.get(f.file) ?? [];
    arr.push(f);
    byFile.set(f.file, arr);
  }

  const out: string[] = [];
  out.push('# Audit Report — Contexto Pessoal no Repo ForgeClaw');
  out.push('');
  out.push(`Gerado em: ${new Date().toISOString()}`);
  out.push(`Arquivos varridos: ${filesCount}`);
  out.push(`Findings totais: ${all.length}`);
  out.push('');

  const bySev: Record<Finding['severity'], number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of all) bySev[f.severity]++;
  out.push('## Sumario por severidade');
  out.push('');
  out.push(`- critical: ${bySev.critical}`);
  out.push(`- high: ${bySev.high}`);
  out.push(`- medium: ${bySev.medium}`);
  out.push(`- low: ${bySev.low}`);
  out.push('');

  const byCat: Record<string, number> = {};
  for (const f of all) byCat[f.category] = (byCat[f.category] ?? 0) + 1;
  out.push('## Sumario por categoria');
  out.push('');
  for (const [c, n] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    out.push(`- ${c}: ${n}`);
  }
  out.push('');

  out.push('## Findings por arquivo');
  out.push('');
  const sortedFiles = [...byFile.keys()].sort();
  for (const file of sortedFiles) {
    const fs = byFile.get(file)!;
    const maxSev = fs.reduce<Finding['severity']>(
      (acc, x) => (SEV_ORDER[x.severity] < SEV_ORDER[acc] ? x.severity : acc),
      'low',
    );
    out.push(`### \`${file}\` (${fs.length} findings, pior: ${maxSev})`);
    out.push('');
    out.push('| Linha | Sev | Categoria | Pattern | Snippet |');
    out.push('|-------|-----|-----------|---------|---------|');
    for (const f of fs) {
      const snip = f.snippet.replace(/\|/g, '\\|').replace(/`/g, "'");
      const pat = f.pattern.replace(/\|/g, '\\|').replace(/`/g, "'");
      out.push(`| ${f.line} | ${f.severity} | ${f.category} | \`${pat}\` | \`${snip}\` |`);
    }
    out.push('');
  }

  return out.join('\n');
}

// ---------------------------------------------------------------------------
// CI mode helpers (introduzido em 23-03)
//
// Objetivo: o scanner passa de "auditor que emite report" para "gate de CI
// que bloqueia regressoes". O contrato e simples: se um finding `critical`
// aparecer em codigo distribuido (fora de `.plano/`, `node_modules/`, `.git/`)
// e nao estiver na allowlist, exit 1. Caso contrario exit 0.
//
// Allowlist e um arquivo texto na raiz do repo (`.audit-personal-allowlist.txt`)
// com linhas no formato `<file>:<line>:<category>  # <justificativa>`.
// Match e EXATO — se o arquivo editar e a linha deslocar, a suppressao quebra
// e forca re-revisao. Isso e desejado.
// ---------------------------------------------------------------------------

function isDistributed(file: string): boolean {
  return (
    !file.startsWith('.plano/') &&
    !file.startsWith('node_modules/') &&
    !file.startsWith('.git/')
  );
}

async function loadAllowlist(): Promise<Set<string>> {
  const allowlistPath = join(REPO_ROOT, '.audit-personal-allowlist.txt');
  const allowed = new Set<string>();
  try {
    const raw = await readFile(allowlistPath, 'utf-8');
    for (const rawLine of raw.split('\n')) {
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      // Strip comentario inline "<key>  # <reason>"
      const key = trimmed.split('#')[0].trim();
      if (key) allowed.add(key);
    }
  } catch {
    // allowlist ausente = zero suppressions. OK.
  }
  return allowed;
}

function runCiMode(all: Finding[], allowed: Set<string>): void {
  const blocking = all.filter(
    (f) =>
      f.severity === 'critical' &&
      isDistributed(f.file) &&
      !allowed.has(`${f.file}:${f.line}:${f.category}`),
  );

  if (blocking.length === 0) {
    console.log('AUDIT PASS — 0 critical findings in distributed code.');
    process.exit(0);
  }

  console.error(
    `AUDIT FAIL — ${blocking.length} critical findings in distributed code:\n`,
  );
  for (const f of blocking) {
    console.error(`  ${f.file}:${f.line} [${f.category}] ${f.snippet}`);
  }
  console.error(
    '\nTo suppress a known false positive, add a line to .audit-personal-allowlist.txt:',
  );
  console.error('  <file>:<line>:<category>  # <justification>');
  process.exit(1);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const wantJson = args.includes('--json');
  const wantCi = args.includes('--ci');
  const outArg = args.find((a) => a.startsWith('--out='))?.split('=')[1];

  const files: string[] = [];
  await walk(REPO_ROOT, files);

  const all: Finding[] = [];
  for (const f of files) {
    const fs = await scanFile(f);
    all.push(...fs);
  }
  await registerPlaywrightDir(all);

  // Ordena: severity asc (critical primeiro), depois file, depois line
  all.sort(
    (a, b) =>
      SEV_ORDER[a.severity] - SEV_ORDER[b.severity] ||
      a.file.localeCompare(b.file) ||
      a.line - b.line,
  );

  // ----- CI mode (23-03) -----
  // Quando --ci presente, nao escreve markdown/json; apenas aplica gate e
  // exita com codigo apropriado. outArg e ignorado de proposito (CI escreve
  // log no stdout/stderr, nao em arquivo).
  if (wantCi) {
    const allowed = await loadAllowlist();
    runCiMode(all, allowed);
    return; // inalcancavel (runCiMode chama process.exit), mas deixa o compilador feliz.
  }

  if (wantJson) {
    const payload = JSON.stringify(all, null, 2);
    if (outArg) await writeFile(outArg, payload, 'utf-8');
    else console.log(payload);
    return;
  }

  const md = renderMarkdown(all, files.length);
  if (outArg) await writeFile(outArg, md, 'utf-8');
  else console.log(md);
}

main().catch((err) => {
  console.error('[audit] fatal:', err);
  process.exit(1);
});
