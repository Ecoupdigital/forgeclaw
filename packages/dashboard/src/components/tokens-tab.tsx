"use client";

import { useState, useEffect } from "react";

interface DailySummary {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  count: number;
}

interface Totals {
  totalInput: number;
  totalOutput: number;
  totalCacheCreation: number;
  totalCacheRead: number;
  totalRequests: number;
}

interface TopSession {
  sessionKey: string;
  totalInput: number;
  totalOutput: number;
  totalCache: number;
  count: number;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function TokensTab() {
  const [daily, setDaily] = useState<DailySummary[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [topSessions, setTopSessions] = useState<TopSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/tokens?days=${days}`).then((r) => r.json()),
      fetch("/api/tokens/stats").then((r) => r.json()),
    ])
      .then(([tokensRes, statsRes]) => {
        setDaily(tokensRes.daily ?? []);
        setTotals(statsRes.totals ?? null);
        setTopSessions(statsRes.topSessions ?? []);
      })
      .catch((err) => console.error("[tokens-tab] Fetch error:", err))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-text-secondary text-sm">
        Carregando dados de tokens...
      </div>
    );
  }

  const maxDailyTotal = Math.max(
    ...daily.map((d) => d.inputTokens + d.outputTokens + d.cacheCreationTokens + d.cacheReadTokens),
    1,
  );

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-body">Uso de Tokens</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded border border-white/10 bg-deep-space px-2 py-1 text-xs text-text-body"
        >
          <option value={7}>7 dias</option>
          <option value={14}>14 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
        </select>
      </div>

      {/* Totals cards */}
      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Input" value={formatNumber(totals.totalInput)} color="text-blue-400" />
          <StatCard label="Output" value={formatNumber(totals.totalOutput)} color="text-emerald-400" />
          <StatCard label="Cache Write" value={formatNumber(totals.totalCacheCreation)} color="text-amber-400" />
          <StatCard label="Cache Read" value={formatNumber(totals.totalCacheRead)} color="text-violet" />
        </div>
      )}

      {/* Daily chart (CSS bar chart — no external deps) */}
      {daily.length > 0 ? (
        <div className="rounded-lg border border-white/[0.06] bg-deep-space/50 p-4">
          <div className="mb-3 flex items-center gap-4 text-[10px] text-text-secondary">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-blue-400" /> Input</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" /> Output</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-amber-400" /> Cache Write</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-violet" /> Cache Read</span>
          </div>
          <div className="flex items-end gap-px" style={{ height: 160 }}>
            {daily.map((d) => {
              const total = d.inputTokens + d.outputTokens + d.cacheCreationTokens + d.cacheReadTokens;
              const heightPct = (total / maxDailyTotal) * 100;
              const inputPct = total > 0 ? (d.inputTokens / total) * 100 : 0;
              const outputPct = total > 0 ? (d.outputTokens / total) * 100 : 0;
              const cacheCPct = total > 0 ? (d.cacheCreationTokens / total) * 100 : 0;
              const cacheRPct = total > 0 ? (d.cacheReadTokens / total) * 100 : 0;

              return (
                <div
                  key={d.date}
                  className="group relative flex flex-1 flex-col justify-end"
                  style={{ height: "100%" }}
                  title={`${d.date}: ${formatNumber(total)} tokens (${d.count} reqs)`}
                >
                  <div className="flex flex-col" style={{ height: `${heightPct}%` }}>
                    {cacheRPct > 0 && <div className="bg-violet/80 rounded-t-sm" style={{ flex: cacheRPct }} />}
                    {cacheCPct > 0 && <div className="bg-amber-400/80" style={{ flex: cacheCPct }} />}
                    {outputPct > 0 && <div className="bg-emerald-400/80" style={{ flex: outputPct }} />}
                    {inputPct > 0 && <div className="bg-blue-400/80 rounded-b-sm" style={{ flex: inputPct }} />}
                  </div>
                  {/* Tooltip on hover */}
                  <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded bg-black/90 px-2 py-1 text-[10px] text-text-body whitespace-nowrap group-hover:block">
                    {d.date}: {formatNumber(total)}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Date labels (first and last) */}
          <div className="mt-1 flex justify-between text-[10px] text-text-secondary">
            <span>{daily[0]?.date ?? ""}</span>
            <span>{daily[daily.length - 1]?.date ?? ""}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-white/[0.06] bg-deep-space/50 p-8 text-center text-sm text-text-secondary">
          Nenhum dado de tokens ainda. Os dados aparecerao apos a primeira mensagem processada.
        </div>
      )}

      {/* Top sessions table */}
      {topSessions.length > 0 && (
        <div className="rounded-lg border border-white/[0.06] bg-deep-space/50">
          <div className="border-b border-white/[0.06] px-4 py-2">
            <h3 className="text-xs font-medium text-text-body">Top Sessoes por Consumo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-text-secondary">
                  <th className="px-4 py-2 font-medium">Sessao</th>
                  <th className="px-4 py-2 font-medium text-right">Input</th>
                  <th className="px-4 py-2 font-medium text-right">Output</th>
                  <th className="px-4 py-2 font-medium text-right">Cache</th>
                  <th className="px-4 py-2 font-medium text-right">Reqs</th>
                </tr>
              </thead>
              <tbody>
                {topSessions.map((s) => (
                  <tr key={s.sessionKey} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2 font-mono text-text-body">{s.sessionKey}</td>
                    <td className="px-4 py-2 text-right text-blue-400">{formatNumber(s.totalInput)}</td>
                    <td className="px-4 py-2 text-right text-emerald-400">{formatNumber(s.totalOutput)}</td>
                    <td className="px-4 py-2 text-right text-violet">{formatNumber(s.totalCache)}</td>
                    <td className="px-4 py-2 text-right text-text-secondary">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-deep-space/50 p-3">
      <div className="text-[10px] text-text-secondary">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
