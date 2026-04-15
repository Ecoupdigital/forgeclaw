---
phase: 08-dashboard-web
plan: 08-05
type: feature
autonomous: true
wave: 2
depends_on: [08-01, 08-02]
requirements: [DASH-04]
files_modified:
  - packages/dashboard/package.json
  - packages/dashboard/src/components/cron-form-sheet.tsx
  - packages/dashboard/src/lib/cron-presets.ts
must_haves:
  truths:
    - "Componente CronFormSheet renderiza um Sheet lateral direito com form completo (Name, Schedule, Prompt, Target topic, Enabled)"
    - "Schedule tem dropdown com 5 presets + Custom, Custom abre input text"
    - "cron-parser valida o schedule on-the-fly e mostra erro inline em vermelho"
    - "Botao Save fica disabled enquanto schedule invalido ou name vazio ou prompt vazio"
    - "Abaixo do campo schedule aparecem: human-readable (cronstrue) + proximas 3 execucoes (cron-parser)"
    - "Timezone local do runtime exibido perto do input"
    - "Textarea de prompt tem placeholder sugerindo {today}, {yesterday}, {now} e um link 'Skills disponiveis' que abre sheet lateral secundario com lista do /api/skills"
    - "Target topic dropdown populado de /api/topics com opcao default 'Default (use harness default)'"
    - "Componente suporta modo create (vazio) e edit (populado via prop initialJob: CronJob)"
    - "Submit faz POST (create) ou PUT action:update (edit) para /api/crons e chama callback onSaved"
  artifacts:
    - path: "packages/dashboard/src/components/cron-form-sheet.tsx"
      provides: "Componente client 'use client' com props { open, onOpenChange, initialJob?, onSaved }"
    - path: "packages/dashboard/src/lib/cron-presets.ts"
      provides: "Constante CRON_PRESETS com 5 presets + tipo CronPreset"
    - path: "packages/dashboard/package.json"
      provides: "cron-parser ^5.5.0 e cronstrue ^3.14.0 nas dependencies"
  key_links:
    - from: "CronFormSheet"
      to: "POST /api/crons"
      via: "fetch com body {name, schedule, prompt, targetTopicId, enabled, origin:'db'}"
    - from: "CronFormSheet"
      to: "PUT /api/crons"
      via: "fetch com body {id, action:'update', name, schedule, prompt, targetTopicId, enabled}"
    - from: "CronFormSheet helper skills"
      to: "GET /api/skills"
      via: "fetch onMount, popular sheet lateral"
    - from: "CronFormSheet target topic"
      to: "GET /api/topics"
      via: "fetch onMount, popular dropdown"
---

# Fase 8 Plano 05: CronFormSheet (criar e editar)

**Objetivo:** Criar o componente `CronFormSheet.tsx` que implementa o form completo de criacao e edicao de cron jobs, seguindo todas as decisoes de UX do CONTEXT.md (presets + custom, validacao dupla, preview duplo, helper de skills, template vars hint). Adicionar `cron-parser` e `cronstrue` como deps do package `dashboard`. Este plano NAO mexe em `crons-tab.tsx` — isso e responsabilidade do plano 06, que wireia o componente criado aqui.

## Research

**Next.js docs consultados:**
- `packages/dashboard/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` (linhas 1-100): confirma que componentes interativos (form state, onChange, useEffect) DEVEM ser marcados com `'use client'` no topo do arquivo. Este form usa `useState` extensivamente → `'use client'` obrigatorio.
- Hooks e event handlers (`onChange`, `onClick`) sao apontados como casos de Client Component. Sem mudanca em relacao ao Next 15 — `'use client'` continua valido.
- Nao ha Server Action envolvida — o form usa `fetch` para endpoints existentes. Decisao: manter padrao `fetch` para alinhar com o resto do codebase (`crons-tab.tsx`, `sessions/route.ts` etc.), evitando Server Actions ate a fase de refactor geral.

**Decisoes travadas do CONTEXT.md honradas:**
- `decisions > UX do schedule`: presets fixos listados exatos, Custom, validacao cron-parser, cronstrue preview, proximas 3 execucoes, TZ local visivel, macros cron.
- `decisions > Campos do form`: Name obrigatorio, Schedule obrigatorio, Prompt obrigatorio com placeholder sugestivo, Target topic dropdown com default, Enabled toggle default true.
- `decisions > Template vars`: placeholder do textarea menciona `{today}, {yesterday}, {now}`.
- `decisions > Skills no prompt`: link "Skills disponiveis" abre sheet lateral.
- `decisions > Pos-save`: fecha form, toast (callback pro plano 06), job aparece na lista.
- `decisions > Criterio do Claude`: "sheet lateral direita" escolhida como layout.
- `specifics`: "shadcn/ui ja tem `Button`, `Textarea`, `Separator`, `Card`, `Input`, `Dialog`, `Sheet`, `Dropdown`, `Tabs`, `Badge`" — usar esses.
- `specifics`: "cron-parser e cronstrue precisam entrar como deps do package `dashboard`."
- `specifics`: "API POST /api/crons ja aceita `{name, schedule, prompt, targetTopicId, enabled}`. Pode ser que precise adicionar `origin: 'db'` no payload". O plano 01 ja fez o backend aceitar `origin` com default 'db' — ainda assim, este form passa `origin: 'db'` explicitamente para clareza.

**Libs escolhidas:**
- `cron-parser@^5.5.0` (parser). API: `import { CronExpressionParser } from 'cron-parser'; const iter = CronExpressionParser.parse('0 9 * * *'); iter.next().toDate()`. Em v5 o nome do export mudou de `parseExpression` para `CronExpressionParser.parse`. Verificar pos-install.
- `cronstrue@^3.14.0` (human-readable). API: `import cronstrue from 'cronstrue'; cronstrue.toString('0 9 * * *')`. Zero deps.

**Instalacao:**
- Monorepo usa `bun` (package.json root). Rodar `bun add cron-parser cronstrue -w @forgeclaw/dashboard` OU dentro de `packages/dashboard` rodar `bun add cron-parser cronstrue`.

## Contexto

@packages/dashboard/src/components/ui/sheet.tsx — componente Sheet (base-ui/react dialog), Sheet/SheetTrigger/SheetContent/SheetHeader/SheetTitle/SheetDescription/SheetClose/SheetFooter
@packages/dashboard/src/components/ui/button.tsx — Button component
@packages/dashboard/src/components/ui/input.tsx — Input
@packages/dashboard/src/components/ui/textarea.tsx — Textarea
@packages/dashboard/src/components/ui/dropdown-menu.tsx — Dropdown
@packages/dashboard/src/components/crons-tab.tsx — contexto visual atual (design tokens: violet, violet-dim, night-panel, deep-space, text-primary/secondary/body)
@packages/dashboard/src/lib/types.ts — CronJob, SkillInfo (plano 02 adicionou)
@packages/dashboard/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md — `'use client'` directive

## Tarefas

<task id="1" type="auto">
<files>packages/dashboard/package.json</files>
<action>
Adicionar as duas dependencias. Rodar no diretorio `packages/dashboard`:

```bash
cd /home/projects/ForgeClaw/packages/dashboard && bun add cron-parser cronstrue
```

Isso deve atualizar `packages/dashboard/package.json` com:
```json
"cron-parser": "^5.5.0",
"cronstrue": "^3.14.0"
```
(versoes exatas podem variar — o lockfile resolve).

Apos instalar, verificar que o `package.json` tem as duas entradas em `dependencies`.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/dashboard && grep -q '"cron-parser"' package.json && grep -q '"cronstrue"' package.json && echo OK</automated>
</verify>
<done>As duas deps estao em packages/dashboard/package.json. `node_modules/cron-parser` e `node_modules/cronstrue` existem. Import `import { CronExpressionParser } from 'cron-parser'` e `import cronstrue from 'cronstrue'` resolvem.</done>
</task>

<task id="2" type="auto">
<files>packages/dashboard/src/lib/cron-presets.ts</files>
<action>
Criar novo arquivo com a lista fixa de presets. Arquivo inteiro:

```typescript
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
  { value: "0 * * * *", label: "Every hour" },
  { value: "0 9 * * *", label: "Every day at 9am" },
  { value: "0 8 * * 1-5", label: "Every weekday morning (8am)" },
  { value: "0 9 * * 1", label: "Every Monday 9am" },
];

export const CRON_CUSTOM_SENTINEL = "__custom__";
```
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit src/lib/cron-presets.ts</automated>
</verify>
<done>Arquivo existe, compila, exporta CRON_PRESETS e CRON_CUSTOM_SENTINEL.</done>
</task>

<task id="3" type="auto">
<files>packages/dashboard/src/components/cron-form-sheet.tsx</files>
<action>
Criar o componente principal. Arquivo inteiro:

```tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import cronstrue from "cronstrue";
import { CronExpressionParser } from "cron-parser";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CRON_PRESETS, CRON_CUSTOM_SENTINEL } from "@/lib/cron-presets";
import type { CronJob, SkillInfo } from "@/lib/types";

interface TopicSlim {
  id: number;
  name: string;
  chatId: number;
  threadId: number | null;
}

interface CronFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialJob?: CronJob | null; // null/undefined = create mode, preenchido = edit mode
  onSaved: (job: CronJob) => void;
}

interface SchedulePreview {
  humanReadable: string | null;
  nextRuns: string[];
  error: string | null;
}

const LOCAL_TZ = typeof Intl !== "undefined"
  ? Intl.DateTimeFormat().resolvedOptions().timeZone
  : "local";

function validateSchedule(expr: string): SchedulePreview {
  const trimmed = expr.trim();
  if (!trimmed) {
    return { humanReadable: null, nextRuns: [], error: "Schedule is required" };
  }
  try {
    const iter = CronExpressionParser.parse(trimmed);
    const runs: string[] = [];
    for (let i = 0; i < 3; i++) {
      runs.push(iter.next().toDate().toLocaleString());
    }
    let human: string | null = null;
    try {
      human = cronstrue.toString(trimmed, { use24HourTimeFormat: true });
    } catch {
      human = null;
    }
    return { humanReadable: human, nextRuns: runs, error: null };
  } catch (err) {
    return {
      humanReadable: null,
      nextRuns: [],
      error: err instanceof Error ? err.message : "Invalid cron expression",
    };
  }
}

export function CronFormSheet({ open, onOpenChange, initialJob, onSaved }: CronFormSheetProps) {
  const isEdit = Boolean(initialJob?.id);

  // Form state
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<string>(CRON_PRESETS[0].value);
  const [customSchedule, setCustomSchedule] = useState("");
  const [prompt, setPrompt] = useState("");
  const [targetTopicId, setTargetTopicId] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(true);

  // External data
  const [topics, setTopics] = useState<TopicSlim[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [skillsOpen, setSkillsOpen] = useState(false);

  // Submit state
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form when sheet opens / initialJob changes
  useEffect(() => {
    if (!open) return;
    if (initialJob) {
      setName(initialJob.name);
      // Se o schedule bate com um preset, seleciona esse preset; senao custom
      const matchingPreset = CRON_PRESETS.find((p) => p.value === initialJob.schedule);
      if (matchingPreset) {
        setPreset(matchingPreset.value);
        setCustomSchedule("");
      } else {
        setPreset(CRON_CUSTOM_SENTINEL);
        setCustomSchedule(initialJob.schedule);
      }
      setPrompt(initialJob.prompt);
      setTargetTopicId(initialJob.targetTopicId);
      setEnabled(initialJob.enabled);
    } else {
      setName("");
      setPreset(CRON_PRESETS[0].value);
      setCustomSchedule("");
      setPrompt("");
      setTargetTopicId(null);
      setEnabled(true);
    }
    setSubmitError(null);
  }, [open, initialJob]);

  // Load topics and skills when open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const [tRes, sRes] = await Promise.all([
          fetch("/api/topics"),
          fetch("/api/skills"),
        ]);
        const tData = (await tRes.json()) as { topics: TopicSlim[] };
        const sData = (await sRes.json()) as { skills: SkillInfo[] };
        if (cancelled) return;
        setTopics(tData.topics ?? []);
        setSkills(sData.skills ?? []);
      } catch (err) {
        console.error("[CronFormSheet] Failed to load topics/skills:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Resolved schedule (preset or custom)
  const currentSchedule = preset === CRON_CUSTOM_SENTINEL ? customSchedule : preset;
  const preview = useMemo(() => validateSchedule(currentSchedule), [currentSchedule]);

  const canSave =
    name.trim().length > 0 &&
    prompt.trim().length > 0 &&
    preview.error === null &&
    !saving;

  const handleSubmit = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    setSubmitError(null);
    try {
      let res: Response;
      if (isEdit && initialJob) {
        res = await fetch("/api/crons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: initialJob.id,
            action: "update",
            name: name.trim(),
            schedule: currentSchedule.trim(),
            prompt: prompt.trim(),
            targetTopicId,
            enabled,
          }),
        });
      } else {
        res = await fetch("/api/crons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            schedule: currentSchedule.trim(),
            prompt: prompt.trim(),
            targetTopicId,
            enabled,
            origin: "db",
          }),
        });
      }
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Save failed");
      }
      // Construir CronJob result (se backend retornou, usa; senao, monta local)
      const saved: CronJob = {
        id: data.job?.id ?? initialJob?.id ?? 0,
        name: name.trim(),
        schedule: currentSchedule.trim(),
        prompt: prompt.trim(),
        targetTopicId,
        enabled,
        lastRun: initialJob?.lastRun ?? null,
        lastStatus: initialJob?.lastStatus ?? null,
        origin: "db",
        sourceFile: null,
      };
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }, [canSave, isEdit, initialJob, name, currentSchedule, prompt, targetTopicId, enabled, onSaved, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto bg-deep-space border-violet-dim">
        <SheetHeader>
          <SheetTitle className="text-text-primary">
            {isEdit ? "Edit cron" : "New cron"}
          </SheetTitle>
          <SheetDescription className="text-text-secondary">
            {isEdit ? "Update this cron job." : "Schedule a prompt to run on a cron expression."}
          </SheetDescription>
        </SheetHeader>

        <Separator className="bg-violet-dim" />

        <div className="flex flex-col gap-4 p-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning summary"
              className="border-violet-dim bg-night-panel text-text-body"
            />
          </div>

          {/* Schedule preset */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Schedule</label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="rounded-md border border-violet-dim bg-night-panel px-3 py-2 text-sm text-text-body focus:outline-none focus:ring-2 focus:ring-violet"
            >
              {CRON_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label} ({p.value})</option>
              ))}
              <option value={CRON_CUSTOM_SENTINEL}>Custom...</option>
            </select>
            {preset === CRON_CUSTOM_SENTINEL && (
              <Input
                value={customSchedule}
                onChange={(e) => setCustomSchedule(e.target.value)}
                placeholder="e.g. 0 9 * * * or @daily"
                className="mt-2 font-mono border-violet-dim bg-night-panel text-text-body"
              />
            )}
            <p className="text-[10px] text-text-secondary/70">Timezone: {LOCAL_TZ}</p>
            {preview.error && (
              <p className="text-xs text-red-400">{preview.error}</p>
            )}
            {!preview.error && preview.humanReadable && (
              <p className="text-xs text-text-body">{preview.humanReadable}</p>
            )}
            {!preview.error && preview.nextRuns.length > 0 && (
              <div className="text-[11px] text-text-secondary">
                <span className="text-text-secondary/80">Next runs:</span>
                <ul className="ml-1 list-disc pl-3">
                  {preview.nextRuns.map((r, i) => (<li key={i}>{r}</li>))}
                </ul>
              </div>
            )}
          </div>

          {/* Prompt */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Use /up:progresso e me envie um resumo do dia. Disponivel: {today}, {yesterday}, {now}."
              className="min-h-[120px] resize-y border-violet-dim bg-night-panel font-mono text-xs text-text-body focus-visible:ring-violet"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSkillsOpen(true)}
                className="text-[11px] text-violet underline hover:text-violet/80"
              >
                Skills disponiveis ({skills.length})
              </button>
              <span className="text-[10px] text-text-secondary/60">{prompt.length} chars</span>
            </div>
            <p className="text-[10px] text-text-secondary/60">
              Template vars: <span className="font-mono">{"{today}"}</span> <span className="font-mono">{"{yesterday}"}</span> <span className="font-mono">{"{now}"}</span>
            </p>
          </div>

          {/* Target topic */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Target topic</label>
            <select
              value={targetTopicId ?? ""}
              onChange={(e) => setTargetTopicId(e.target.value === "" ? null : Number(e.target.value))}
              className="rounded-md border border-violet-dim bg-night-panel px-3 py-2 text-sm text-text-body focus:outline-none focus:ring-2 focus:ring-violet"
            >
              <option value="">Default (use harness default)</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name} (chat {t.chatId})</option>
              ))}
            </select>
          </div>

          {/* Enabled */}
          <div className="flex items-center gap-2">
            <input
              id="cron-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-violet"
            />
            <label htmlFor="cron-enabled" className="text-xs text-text-secondary">Enabled</label>
          </div>

          {submitError && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400">{submitError}</p>
          )}
        </div>

        <SheetFooter>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="flex-1 border-violet-dim text-text-secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSave}
              className="flex-1 bg-violet text-white hover:bg-violet/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : isEdit ? "Save changes" : "Create cron"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>

      {/* Skills helper sheet (second sheet, nested) */}
      <Sheet open={skillsOpen} onOpenChange={setSkillsOpen}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto bg-deep-space border-violet-dim">
          <SheetHeader>
            <SheetTitle className="text-text-primary">Skills disponiveis</SheetTitle>
            <SheetDescription className="text-text-secondary">
              Voce pode chamar qualquer uma destas no prompt (ex: /up:progresso).
              Skills que dependem de input interativo (AskUserQuestion) nao funcionam bem em cron.
            </SheetDescription>
          </SheetHeader>
          <Separator className="bg-violet-dim" />
          <div className="flex flex-col gap-2 p-4">
            {skills.length === 0 && (
              <p className="text-xs text-text-secondary">No skills found in ~/.claude/skills/</p>
            )}
            {skills.map((s) => (
              <div key={s.source} className="rounded-md border border-violet-dim bg-night-panel p-2">
                <p className="font-mono text-xs text-text-primary">{s.name}</p>
                {s.description && (
                  <p className="mt-0.5 text-[11px] text-text-secondary">{s.description}</p>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </Sheet>
  );
}
```

Notas de implementacao:
- `'use client'` no topo (obrigatorio conforme docs Next.js 16).
- Dois `Sheet` aninhados: o principal (form) e um secundario (skills helper). Ambos controlados por `open`/`onOpenChange`.
- Reset do form state acontece quando `open` vira true OU quando `initialJob` muda (edit de job diferente).
- `canSave` e derivado puro — botao Save desabilita automaticamente se invalido.
- Preview duplo (cronstrue + cron-parser.next x3) — atualizado via `useMemo` com dependencia em `currentSchedule`.
- Timezone exibida via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- `targetTopicId: null` no dropdown = "Default". HTML `<option value="">` com conversao ao onChange.
- Submit envia `origin: 'db'` no POST (plano 01 aceita isso).
- Sem toast aqui — callback `onSaved` permite o parent (plano 06) decidir (toast + pulse). Isso mantem o componente focado em form, nao em feedback global.
- Usa `<select>` HTML puro em vez de dropdown-menu shadcn porque form selects sao mais simples. Design tokens violet aplicados via className.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit</automated>
</verify>
<done>Componente compila. Props exportados corretamente. Imports de cron-parser/cronstrue resolvem. No visual check manual do form na proxima fase (plano 06 faz o wire).</done>
</task>

## Criterios de Sucesso

- [ ] `packages/dashboard` compila sem erros
- [ ] `packages/dashboard/package.json` tem cron-parser e cronstrue
- [ ] CronFormSheet exportado e recebe `{open, onOpenChange, initialJob?, onSaved}`
- [ ] Presets dropdown tem 5 opcoes + Custom
- [ ] Validacao cron-parser ativa em onChange do schedule
- [ ] Preview cronstrue + proximas 3 execucoes exibido
- [ ] TZ local exibida perto do schedule input
- [ ] Save button desabilita enquanto invalido
- [ ] Submit diferencia POST (create) e PUT (update) pelo prop initialJob
- [ ] Link "Skills disponiveis" abre sheet secundario com lista de /api/skills
- [ ] Dropdown target topic popula de /api/topics, default "Default (use harness default)"
- [ ] Template vars listadas abaixo do textarea
