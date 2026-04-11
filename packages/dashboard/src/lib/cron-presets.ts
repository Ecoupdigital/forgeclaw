/**
 * Presets fixos para o dropdown de schedule do CronFormSheet.
 * Ordem e conteudo DEFINIDOS pelo CONTEXT.md (decisions > UX do schedule).
 * Nao e uma biblioteca user-custom — "save as preset" esta deferido.
 */

export interface CronPreset {
  value: string; // expressao cron
  label: string; // label para o dropdown
}

// NOTE: all hours are interpreted in the server's local timezone, which is
// currently UTC. "0 9 * * *" means 9:00 UTC, not 9:00 in the user's local
// time. See cron-engine.ts: `new Cron(expr, handler)` uses croner's default
// (system local time). If the host TZ changes, these presets' wall-clock
// behavior changes too.
export const CRON_PRESETS: CronPreset[] = [
  { value: "*/15 * * * *", label: "Every 15 minutes" },
  { value: "*/30 * * * *", label: "Every 30 minutes" },
  { value: "0 * * * *", label: "Every hour" },
  { value: "0 */12 * * *", label: "Every 12 hours (00 and 12 UTC)" },
  { value: "0 9 * * *", label: "Every day at 9am UTC" },
  { value: "0 8 * * 1-5", label: "Every weekday morning (8am UTC)" },
  { value: "0 9 * * 1", label: "Every Monday 9am UTC" },
];

export const CRON_CUSTOM_SENTINEL = "__custom__";
