#!/usr/bin/env bun
/**
 * capture-screenshots.ts
 *
 * Automatiza captura de screenshots do dashboard ForgeClaw para uso em docs/.
 * Requer Playwright (opcional — script tem fallback se nao instalado).
 *
 * Uso:
 *   bun run scripts/capture-screenshots.ts
 *
 * Env:
 *   FORGECLAW_DASHBOARD_TOKEN  token do dashboard (fallback: lido de ~/.forgeclaw/forgeclaw.config.json)
 *   FORGECLAW_DASHBOARD_URL    url base (default http://localhost:4040)
 *
 * Output:
 *   docs/screenshots/*.png
 */

import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

interface CaptureSpec {
  name: string;
  path: string; // rota no dashboard, relativa
  waitFor?: string; // css selector opcional
  description: string;
}

const CAPTURES: CaptureSpec[] = [
  { name: 'dashboard-home', path: '/', waitFor: 'main', description: 'Home do dashboard logado' },
  { name: 'tab-sessoes', path: '/sessions', waitFor: '[data-testid="sessions-kanban"], main', description: 'Aba Sessoes' },
  { name: 'tab-automacoes', path: '/crons', waitFor: 'main', description: 'Aba Automacoes' },
  { name: 'tab-memoria', path: '/memory', waitFor: 'main', description: 'Aba Memoria' },
  { name: 'tab-agentes', path: '/agents', waitFor: 'main', description: 'Aba Agentes' },
  { name: 'tab-tokens', path: '/tokens', waitFor: 'main', description: 'Aba Tokens' },
  { name: 'tab-atividade', path: '/activity', waitFor: 'main', description: 'Aba Atividade' },
  { name: 'tab-webhooks', path: '/webhooks', waitFor: 'main', description: 'Aba Webhooks' },
  { name: 'tab-config', path: '/config', waitFor: 'main', description: 'Aba Configuracoes' },
  { name: 'tab-personalidade', path: '/harness', waitFor: 'main', description: 'Aba Personalidade' },
  { name: 'agents-overview', path: '/agents', waitFor: 'main', description: 'Agentes overview' },
  { name: 'crons-overview', path: '/crons', waitFor: 'main', description: 'Crons overview' },
  { name: 'harness-editor', path: '/harness', waitFor: 'main', description: 'Harness editor' },
];

const OUT_DIR = join(process.cwd(), 'docs', 'screenshots');
const BASE_URL = process.env.FORGECLAW_DASHBOARD_URL ?? 'http://localhost:4040';
const VIEWPORT = { width: 1440, height: 900 };

function readToken(): string | null {
  if (process.env.FORGECLAW_DASHBOARD_TOKEN) return process.env.FORGECLAW_DASHBOARD_TOKEN;
  const cfgPath = join(homedir(), '.forgeclaw', 'forgeclaw.config.json');
  if (!existsSync(cfgPath)) return null;
  try {
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8')) as { dashboardToken?: string };
    return cfg.dashboardToken ?? null;
  } catch {
    return null;
  }
}

function printManualFallback() {
  console.log('');
  console.log('========================================');
  console.log('Playwright nao esta instalado. Fallback manual:');
  console.log('========================================');
  console.log('');
  console.log('Opcao 1 — Instalar Playwright e rodar de novo:');
  console.log('');
  console.log('  bun add -d playwright');
  console.log('  bunx playwright install chromium');
  console.log('  bun run scripts/capture-screenshots.ts');
  console.log('');
  console.log('Opcao 2 — Capturar manualmente:');
  console.log('');
  console.log(`  Dashboard rodando em ${BASE_URL}`);
  console.log('  Para cada uma das rotas abaixo, navegue e tire screenshot 1440x900:');
  console.log('');
  for (const c of CAPTURES) {
    console.log(`    - ${c.name}.png  -> ${BASE_URL}${c.path}  (${c.description})`);
  }
  console.log('');
  console.log(`Guarde em ${OUT_DIR}/`);
  console.log('');
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const token = readToken();
  if (!token) {
    console.error('ERRO: FORGECLAW_DASHBOARD_TOKEN nao definido e nao achei em ~/.forgeclaw/forgeclaw.config.json');
    console.error('Defina o token e rode de novo.');
    process.exit(1);
  }

  // Tentar importar playwright. Se falhar, fallback manual.
  let playwright: typeof import('playwright') | null = null;
  try {
    playwright = await import('playwright');
  } catch {
    printManualFallback();
    return;
  }

  const { chromium } = playwright;
  console.log(`Conectando em ${BASE_URL} com viewport ${VIEWPORT.width}x${VIEWPORT.height}`);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    // inject token as cookie matching middleware expectations
    storageState: {
      cookies: [
        {
          name: 'dashboardToken',
          value: token,
          domain: new URL(BASE_URL).hostname,
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  });

  const page = await ctx.newPage();

  for (const c of CAPTURES) {
    const url = `${BASE_URL}${c.path}`;
    const out = join(OUT_DIR, `${c.name}.png`);
    process.stdout.write(`  ${c.name}... `);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10_000 });
      if (c.waitFor) {
        await page.waitForSelector(c.waitFor, { timeout: 5_000 }).catch(() => {
          /* ignore — captura mesmo sem selector */
        });
      }
      // pequena pausa pra streaming/hydration terminar
      await page.waitForTimeout(500);
      await page.screenshot({ path: out, fullPage: false });
      console.log('OK');
    } catch (err) {
      console.log(`FAIL (${(err as Error).message})`);
    }
  }

  await browser.close();
  console.log('');
  console.log(`Screenshots salvos em ${OUT_DIR}/`);
  console.log('Revise privacidade antes de commitar: docs/screenshots/README.md#privacidade');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
