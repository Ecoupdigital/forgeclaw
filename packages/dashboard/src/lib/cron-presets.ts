/**
 * Presets fixos para o dropdown de schedule do CronFormSheet.
 * Ordem e conteudo DEFINIDOS pelo CONTEXT.md (decisions > UX do schedule).
 * Nao e uma biblioteca user-custom — "save as preset" esta deferido.
 */

export interface CronPreset {
  value: string; // expressao cron
  label: string; // label para o dropdown
}

export const CRON_PRESETS: CronPreset[] = [
  { value: "*/15 * * * *", label: "Every 15 minutes" },
  { value: "*/30 * * * *", label: "Every 30 minutes" },
  { value: "0 * * * *", label: "Every hour" },
  { value: "0 9 * * *", label: "Every day at 9am" },
  { value: "0 8 * * 1-5", label: "Every weekday morning (8am)" },
  { value: "0 9 * * 1", label: "Every Monday 9am" },
];

export const CRON_CUSTOM_SENTINEL = "__custom__";
