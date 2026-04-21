#!/usr/bin/env bun
/**
 * analyze-feedback.ts
 *
 * Parseia feedback-responses.csv (export do Tally ou Google Forms) e calcula
 * as metricas agregadas para POST-ALPHA-REPORT.md e RELEASE-DECISION.md.
 *
 * Uso:
 *   bun run analyze-feedback.ts <path-to-csv>
 *
 * Exemplo:
 *   cd /home/projects/ForgeClaw
 *   bun run .plano/fases/31-FASE_SLUG/analyze-feedback.ts .plano/fases/31-FASE_SLUG/feedback-responses.csv
 *   (substitua 31-FASE_SLUG pelo nome real da pasta da fase)
 *
 * O CSV precisa ter header na primeira linha. O script tenta match flexivel por
 * nome de coluna (pode ser pt-BR do template ou id gerado por Tally).
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// --------- CSV parser minimo (sem dependencia) ---------

function parseCSV(text: string): Record<string, string>[] {
  const lines: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        current.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        current.push(field);
        lines.push(current);
        current = [];
        field = '';
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    lines.push(current);
  }

  if (lines.length === 0) return [];
  const headers = lines[0].map((h) => h.trim());
  return lines.slice(1).filter((row) => row.some((c) => c.trim() !== '')).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = (row[idx] ?? '').trim()));
    return obj;
  });
}

// --------- Column resolver (flexivel) ---------

/**
 * Tenta localizar uma coluna no CSV por varios possiveis nomes (pt-BR, id, label).
 * Retorna o valor da primeira coluna encontrada, ou '' se nada.
 */
function getCol(row: Record<string, string>, candidates: string[]): string {
  for (const cand of candidates) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().includes(cand.toLowerCase())) {
        return row[key];
      }
    }
  }
  return '';
}

// --------- Math helpers ---------

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function toNumber(s: string): number | null {
  const cleaned = s.replace(/[^\d.,-]/g, '').replace(',', '.');
  if (cleaned === '') return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function countMatching(rows: Record<string, string>[], colCandidates: string[], predicate: (v: string) => boolean): number {
  return rows.filter((r) => predicate(getCol(r, colCandidates))).length;
}

// --------- NPS ---------

function npsFrom(ratings: number[]): { promoters: number; passives: number; detractors: number; nps: number } {
  let p = 0, pa = 0, d = 0;
  for (const r of ratings) {
    if (r >= 9) p++;
    else if (r >= 7) pa++;
    else d++;
  }
  const total = ratings.length || 1;
  const nps = ((p - d) / total) * 100;
  return { promoters: p, passives: pa, detractors: d, nps: Math.round(nps) };
}

// --------- Main ---------

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Uso: bun run analyze-feedback.ts <path-to-csv>');
    process.exit(2);
  }

  const csvPath = resolve(args[0]);
  if (!existsSync(csvPath)) {
    console.error(`Arquivo nao encontrado: ${csvPath}`);
    process.exit(2);
  }

  const text = readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(text);

  if (rows.length === 0) {
    console.error('CSV sem respostas (apenas header ou vazio).');
    process.exit(1);
  }

  const n = rows.length;

  // T2FM (Q4) — numero em minutos
  const t2fmRaw = rows.map((r) => toNumber(getCol(r, ['T2FM', 'Time To First Message', 'primeira mensagem'])));
  const t2fmValid = t2fmRaw.filter((v): v is number => v !== null && v < 999);

  // Install time (Q6)
  const installRaw = rows.map((r) => toNumber(getCol(r, ['Instalacao em quantos minutos', 'Install time', 'install minutos'])));
  const installValid = installRaw.filter((v): v is number => v !== null && v < 999);

  // Auto-sucesso (Q5)
  const autoSucesso = countMatching(rows, ['sem precisar pingar', 'sem ajuda', 'auto-sucesso'], (v) =>
    v.toLowerCase().includes('primeira tentativa') || v.toLowerCase().includes('reiniciar 1x')
  );

  // Entrevista completada (Q9)
  const entrevistaOk = countMatching(rows, ['completou a entrevista', 'onboarding'], (v) => v.toLowerCase().includes('ate o fim'));

  // Cobertura de abas (Q14) — assume multi-select separado por virgula ou ;
  const abasPorAlpha = rows.map((r) => {
    const v = getCol(r, ['abas do dashboard', 'abas abertas']);
    if (!v) return 0;
    return v.split(/[,;|]/).map((s) => s.trim()).filter((s) => s.length > 0).length;
  });

  // NPS (Q25)
  const npsRaw = rows.map((r) => toNumber(getCol(r, ['NPS', 'recomendaria o ForgeClaw'])));
  const npsRatings = npsRaw.filter((v): v is number => v !== null);
  const npsStats = npsFrom(npsRatings);

  // Estabilidade (Q22)
  const estabilidadeRaw = rows.map((r) => toNumber(getCol(r, ['estabilidade', 'estabilidade do produto'])));
  const estabilidadeValid = estabilidadeRaw.filter((v): v is number => v !== null);

  // Arquetipos (Q7)
  const arquetipos: Record<string, number> = {};
  for (const r of rows) {
    const a = getCol(r, ['arquetipo', 'archetype']).toLowerCase();
    if (a) arquetipos[a] = (arquetipos[a] || 0) + 1;
  }

  // --------- Output ---------

  const metrics = {
    n_responses: n,
    t2fm: {
      median_min: Math.round(median(t2fmValid) * 10) / 10,
      mean_min: Math.round(mean(t2fmValid) * 10) / 10,
      max_min: t2fmValid.length ? Math.max(...t2fmValid) : null,
      min_min: t2fmValid.length ? Math.min(...t2fmValid) : null,
      valid_responses: t2fmValid.length,
      failed_responses: t2fmRaw.filter((v) => v === 999).length,
    },
    install_time: {
      median_min: Math.round(median(installValid) * 10) / 10,
      mean_min: Math.round(mean(installValid) * 10) / 10,
    },
    auto_sucesso: {
      count: autoSucesso,
      rate_pct: Math.round((autoSucesso / n) * 100),
    },
    entrevista_completada: {
      count: entrevistaOk,
      rate_pct: Math.round((entrevistaOk / n) * 100),
    },
    cobertura_abas: {
      mean: Math.round(mean(abasPorAlpha) * 10) / 10,
      median: median(abasPorAlpha),
    },
    nps: {
      score: npsStats.nps,
      promoters: npsStats.promoters,
      passives: npsStats.passives,
      detractors: npsStats.detractors,
      mean_rating: Math.round(mean(npsRatings) * 10) / 10,
    },
    estabilidade: {
      mean: Math.round(mean(estabilidadeValid) * 10) / 10,
      median: median(estabilidadeValid),
    },
    arquetipos,
  };

  // Gate checks
  const gates = {
    nps_ge_30: npsStats.nps >= 30,
    t2fm_median_le_30: metrics.t2fm.median_min <= 30 && metrics.t2fm.median_min > 0,
    entrevista_ge_4_of_5: entrevistaOk >= 4,
    auto_sucesso_ge_4_of_5: autoSucesso >= 4,
    cobertura_abas_ge_5: metrics.cobertura_abas.mean >= 5,
  };
  const allGatesPassed = Object.values(gates).every((v) => v === true);

  console.log('================================================================');
  console.log('FORGECLAW ALPHA — FEEDBACK ANALYSIS');
  console.log('================================================================');
  console.log('');
  console.log(`CSV analisado: ${csvPath}`);
  console.log(`Respostas: ${n}`);
  console.log('');
  console.log('--- Metricas-chave ---');
  console.log(`T2FM mediano: ${metrics.t2fm.median_min} min (target <= 30)`);
  console.log(`T2FM medio:   ${metrics.t2fm.mean_min} min`);
  console.log(`Install time mediano: ${metrics.install_time.median_min} min`);
  console.log(`Auto-sucesso: ${metrics.auto_sucesso.count}/${n} (${metrics.auto_sucesso.rate_pct}%) (target >= 80%)`);
  console.log(`Entrevista completada: ${metrics.entrevista_completada.count}/${n} (${metrics.entrevista_completada.rate_pct}%) (target >= 80%)`);
  console.log(`Cobertura de abas (media): ${metrics.cobertura_abas.mean}/9 (target >= 5)`);
  console.log(`NPS: ${metrics.nps.score}  (P=${metrics.nps.promoters} | Pa=${metrics.nps.passives} | D=${metrics.nps.detractors}) (target >= 30)`);
  console.log(`Rating medio NPS: ${metrics.nps.mean_rating}/10`);
  console.log(`Estabilidade percebida: ${metrics.estabilidade.mean}/10 (target >= 7)`);
  console.log('');
  console.log('--- Arquetipos escolhidos ---');
  Object.entries(arquetipos).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('');
  console.log('--- Gate checks (Go/No-Go) ---');
  Object.entries(gates).forEach(([k, v]) => console.log(`  ${v ? '[X]' : '[ ]'} ${k}`));
  console.log('');
  console.log(`Resultado: ${allGatesPassed ? 'TODOS OS GATES PASSARAM — GO recomendado' : 'ALGUM GATE FALHOU — NO-GO recomendado (ver gates acima)'}`);
  console.log('');
  console.log('--- JSON (para copiar no POST-ALPHA-REPORT.md) ---');
  console.log(JSON.stringify({ metrics, gates, all_gates_passed: allGatesPassed }, null, 2));

  // Nao process.exit(1) em No-Go — o relatorio precisa do output mesmo assim.
  // O humano decide Go/No-Go formalmente em RELEASE-DECISION.md.
  process.exit(0);
}

main();
