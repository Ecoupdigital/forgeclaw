---
phase: 08-dashboard-web
plan: 08-06
type: feature
autonomous: true
wave: 2
depends_on: [08-01, 08-05]
requirements: [DASH-04]
files_modified:
  - packages/dashboard/src/components/crons-tab.tsx
  - packages/dashboard/src/components/cron-card.tsx
  - packages/dashboard/src/components/delete-cron-dialog.tsx
must_haves:
  truths:
    - "CronsTab tem botao '+ New cron' que abre CronFormSheet em modo create"
    - "CronCard exibe badge 'file' ou 'db' segundo job.origin"
    - "CronCard tem botoes Edit, Duplicate, Delete (alem dos existentes View logs, Run now, Pause/Resume)"
    - "Edit e Delete desabilitados para jobs file-origin com tooltip 'Edit in HEARTBEAT.md'"
    - "Duplicate abre CronFormSheet com campos pre-preenchidos (sem id, com ' (copy)' no name)"
    - "Delete abre modal de confirmacao nomeado com nome do job"
    - "Empty state mostra ilustracao/texto + botao 'Create your first cron' que abre o form"
    - "Editor raw do HEARTBEAT.md fica escondido por default atras de um botao 'Advanced' que abre Sheet lateral"
    - "Apos save bem-sucedido, toast aparece e o card recem-criado/editado tem pulse de 3s"
    - "CronsTab refetcha lista apos qualquer save/delete"
  artifacts:
    - path: "packages/dashboard/src/components/crons-tab.tsx"
      provides: "Container rework: botao New cron, Advanced sheet, empty state acionavel, toast, pulse highlight"
    - path: "packages/dashboard/src/components/cron-card.tsx"
      provides: "Card com badge origin, botoes Edit/Duplicate/Delete condicionais por origem, prop highlightedId para pulse"
    - path: "packages/dashboard/src/components/delete-cron-dialog.tsx"
      provides: "Modal Dialog nomeado de confirmacao de delete"
  key_links:
    - from: "CronsTab 'New cron' button"
      to: "CronFormSheet (plano 05)"
      via: "setFormOpen(true), setEditingJob(null)"
    - from: "CronCard 'Edit' button"
      to: "CronFormSheet"
      via: "onEdit(job) -> parent seta editingJob, abre sheet"
    - from: "CronCard 'Delete' button"
      to: "DeleteCronDialog + DELETE /api/crons?id=X"
      via: "confirmacao -> fetch DELETE -> refetch"
    - from: "CronsTab 'Advanced' button"
      to: "Sheet lateral com editor raw do HEARTBEAT.md"
      via: "movido do layout atual (flex-row right panel) para dentro de um Sheet on-demand"
---

# Fase 8 Plano 06: CRUD actions integration em crons-tab

**Objetivo:** Refatorar `crons-tab.tsx` e `cron-card.tsx` para usar o CronFormSheet (plano 05), adicionar botoes Edit/Duplicate/Delete (com restricoes por origem), badge visual de origem, confirmacao de delete, empty state acionavel, pulse highlight pos-save, toast, e mover o editor raw do HEARTBEAT.md (hoje sempre visivel no sidebar) para dentro de um Sheet "Advanced" on-demand. Este plano fecha DASH-04 — todo o sub-recorte e DOD cumprido.

## Research

**Next.js docs consultados:**
- `packages/dashboard/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`: `crons-tab.tsx` ja e `'use client'` (linha 1). Mudancas ficam dentro do client boundary existente. Nenhuma Server Action necessaria.
- Nao ha mudanca em route handlers alem de consumir o DELETE criado no plano 01.

**Decisoes travadas do CONTEXT.md honradas:**
- `decisions > Fonte de verdade > Editor raw`: "escondido por padrao, botao Advanced abre drawer/sheet."
- `decisions > Acoes CRUD`: Create, Edit, Delete, Duplicate entram. Run Now NAO mexer (continua usando o endpoint existente que retorna erro claro).
- `decisions > Acoes CRUD`: Edit/Delete apenas para DB-origin. File-origin com botoes desabilitados + tooltip `"Edit in HEARTBEAT.md"`.
- `decisions > Acoes CRUD`: Duplicate funciona em ambos — cria novo DB job pre-preenchido.
- `decisions > Acoes CRUD`: Confirmacao de delete modal nomeado + Cancel/Delete.
- `decisions > Acoes CRUD`: Empty state com botao "Create your first cron".
- `decisions > Pos-save`: toast + pulse 3s no card.
- `decisions > Visual / distincao de origem`: badge file (cinza-violeta) ou db (violeta forte), mesma lista ordenada por proximo disparo.
- `decisions > Criterio do Claude`: destaque visual livre — escolhido: classe `animate-pulse` do Tailwind por 3s via `setTimeout`.
- `specifics`: "Crons ja funcionam no backend ... o gap e apenas a UX de criacao — nao precisa reimplementar a listagem ou a camada de dados." → Mantemos `useEffect` existente de fetch, apenas expandido com refetch callback.

**Achados do codebase:**
- `crons-tab.tsx` atual (ver @file) tem dois paineis side-by-side: lista e editor raw HEARTBEAT.md. Mover o editor pra dentro de Sheet.
- `cron-card.tsx` atual tem Card + Header + Content + botoes. Adicionar 3 botoes novos + badge origin + suporte a pulse via prop.
- `DELETE /api/crons?id=X` foi criado no plano 01.
- Nao ha lib de toast no dashboard. Escolha: usar um toast state local simples (state em `crons-tab.tsx`, div fixed bottom-right com autoHide 3s). Manter rasteiro — nao introduzir `sonner`/`react-hot-toast` so pra isso.
- Ordenacao "por proximo disparo": calcular via `cron-parser` no client no momento do render. Cache por job id.

## Contexto

@packages/dashboard/src/components/crons-tab.tsx — container atual
@packages/dashboard/src/components/cron-card.tsx — card atual
@packages/dashboard/src/components/ui/dialog.tsx — Dialog shadcn
@packages/dashboard/src/components/ui/sheet.tsx — Sheet shadcn
@packages/dashboard/src/components/cron-form-sheet.tsx — criado no plano 05 (CronFormSheet)
@packages/dashboard/src/app/api/crons/route.ts — DELETE handler criado no plano 01
@packages/dashboard/src/lib/types.ts — CronJob com origin/sourceFile

## Tarefas

<task id="1" type="auto">
<files>packages/dashboard/src/components/delete-cron-dialog.tsx</files>
<action>
Criar novo arquivo. Modal de confirmacao de delete. Arquivo inteiro:

```tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteCronDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobName: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteCronDialog({ open, onOpenChange, jobName, onConfirm, loading }: DeleteCronDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-violet-dim bg-deep-space">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Delete cron &ldquo;{jobName}&rdquo;?</DialogTitle>
          <DialogDescription className="text-text-secondary">
            This cannot be undone. Cron logs for this job are kept for audit.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-violet-dim text-text-secondary"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-500 text-white hover:bg-red-500/90"
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Nota: Confirmar que `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` existem em `@/components/ui/dialog`. Se os nomes diferirem (ex: `DialogPopup` do base-ui), ajustar os imports — a base-ui convention do shadcn custom neste codebase pode usar nomes ligeiramente diferentes. Ler `packages/dashboard/src/components/ui/dialog.tsx` primeiro para confirmar os exports corretos e ajustar.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit</automated>
</verify>
<done>DeleteCronDialog exportado e compila.</done>
</task>

<task id="2" type="auto">
<files>packages/dashboard/src/components/cron-card.tsx</files>
<action>
Refatorar CronCard (linhas 1-159 existentes) para:
1. Adicionar props: `onEdit`, `onDelete`, `onDuplicate`, `highlighted` (boolean).
2. Adicionar badge de origem (file/db) no header.
3. Adicionar 3 botoes na area de acoes: Edit, Duplicate, Delete.
4. Desabilitar Edit/Delete quando `job.origin === 'file'`, com tooltip via `title` attr: "Edit in HEARTBEAT.md".
5. Aplicar classe condicional `animate-pulse` no Card quando `highlighted` e true.

Reescrever a interface de props:
```typescript
interface CronCardProps {
  job: CronJob;
  logs: CronLog[];
  onRunNow: (id: number) => void;
  onToggle: (id: number, enabled: boolean) => void;
  onEdit: (job: CronJob) => void;
  onDelete: (job: CronJob) => void;
  onDuplicate: (job: CronJob) => void;
  runningId: number | null;
  highlighted?: boolean;
}
```

No componente:

1. No topo do `<Card ...>` (linha 39), aplicar:
```tsx
<Card className={`border-violet-dim bg-deep-space transition-colors hover:border-violet-glow ${highlighted ? "animate-pulse ring-2 ring-violet" : ""}`}>
```

2. No `<CardHeader>` (dentro do `<div className="flex items-center gap-2">` da linha 43), adicionar ANTES dos badges existentes um novo badge:
```tsx
<Badge
  variant="outline"
  className={`text-[10px] ${
    job.origin === "db"
      ? "border-violet/60 bg-violet/20 text-violet"
      : "border-text-secondary/30 bg-text-secondary/10 text-text-secondary"
  }`}
>
  {job.origin}
</Badge>
```

3. Na secao de acoes (div `flex items-center gap-2` linha 85), adicionar 3 botoes apos os existentes (antes do fechamento do div):
```tsx
<Button
  variant="outline"
  size="xs"
  onClick={() => onEdit(job)}
  disabled={job.origin === "file"}
  title={job.origin === "file" ? "Edit in HEARTBEAT.md" : "Edit this cron"}
  className="border-violet-dim text-text-secondary hover:text-text-body hover:bg-night-panel disabled:opacity-40"
>
  Edit
</Button>
<Button
  variant="outline"
  size="xs"
  onClick={() => onDuplicate(job)}
  className="border-violet-dim text-text-secondary hover:text-text-body hover:bg-night-panel"
>
  Duplicate
</Button>
<Button
  variant="outline"
  size="xs"
  onClick={() => onDelete(job)}
  disabled={job.origin === "file"}
  title={job.origin === "file" ? "Edit in HEARTBEAT.md" : "Delete this cron"}
  className="border-violet-dim text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-40"
>
  Delete
</Button>
```
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit src/components/cron-card.tsx</automated>
</verify>
<done>Compila. CronCard aceita novas props. Badge origin exibido. Botoes Edit/Duplicate/Delete presentes. file-origin desabilita Edit/Delete com tooltip. highlighted ativa pulse.</done>
</task>

<task id="3" type="auto">
<files>packages/dashboard/src/components/crons-tab.tsx</files>
<action>
Refatorar o container crons-tab.tsx. O arquivo sera essencialmente reescrito — a estrutura principal muda de "lista + sidebar raw editor" para "lista + botao New/Advanced + sheet form + sheet advanced + dialog delete + toast".

Arquivo completo (sobrescrever):

```tsx
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { CronCard } from "./cron-card";
import { CronFormSheet } from "./cron-form-sheet";
import { DeleteCronDialog } from "./delete-cron-dialog";
import { CronExpressionParser } from "cron-parser";
import type { CronJob, CronLog } from "@/lib/types";

export function CronsTab() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [logs, setLogs] = useState<Record<number, CronLog[]>>({});
  const [runningId, setRunningId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Form sheet state
  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<CronJob | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Advanced sheet (raw HEARTBEAT.md editor)
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [heartbeat, setHeartbeat] = useState("");
  const [savingHeartbeat, setSavingHeartbeat] = useState(false);

  // Highlight (pulse) for recently saved card
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  // Toast
  const [toast, setToast] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const showToast = useCallback((text: string, kind: "success" | "error" = "success") => {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch data
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/crons");
      const data = await res.json();
      if (data.jobs) {
        setJobs(data.jobs);
        // Fetch logs for each job
        const logsMap: Record<number, CronLog[]> = {};
        await Promise.all(
          (data.jobs as CronJob[]).map(async (job) => {
            try {
              const lr = await fetch(`/api/crons/${job.id}/logs`);
              const ld = await lr.json();
              if (ld.logs) {
                logsMap[job.id] = (ld.logs as CronLog[])
                  .filter((l) => l.finishedAt)
                  .slice(0, 5);
              }
            } catch { /* ignore */ }
          })
        );
        setLogs(logsMap);
      }
    } catch (err) {
      console.error("Failed to fetch crons:", err);
    }
  }, []);

  const fetchHeartbeat = useCallback(async () => {
    try {
      const hbRes = await fetch("/api/heartbeat");
      const hbData = await hbRes.json();
      if (hbData.content) setHeartbeat(hbData.content);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchJobs(), fetchHeartbeat()]);
      setLoading(false);
    })();
  }, [fetchJobs, fetchHeartbeat]);

  const handleRunNow = useCallback(async (id: number) => {
    setRunningId(id);
    try {
      const res = await fetch("/api/crons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "run_now" }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || "Run now failed", "error");
      }
    } catch {
      showToast("Run now failed", "error");
    } finally {
      setTimeout(() => setRunningId(null), 3000);
    }
  }, [showToast]);

  const handleToggle = useCallback(async (id: number, enabled: boolean) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, enabled } : j)));
    try {
      await fetch("/api/crons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "toggle", enabled }),
      });
    } catch (err) {
      console.error("Failed to toggle cron:", err);
    }
  }, []);

  const handleNew = useCallback(() => {
    setEditingJob(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((job: CronJob) => {
    setEditingJob(job);
    setFormOpen(true);
  }, []);

  const handleDuplicate = useCallback((job: CronJob) => {
    // Cria um "fake" initial job SEM id, com name + (copy) e origin db
    const copy: CronJob = {
      ...job,
      id: 0, // sentinel: CronFormSheet trata id=0 como create
      name: `${job.name} (copy)`,
      origin: "db",
      sourceFile: null,
      lastRun: null,
      lastStatus: null,
    };
    setEditingJob(copy);
    setFormOpen(true);
  }, []);

  const handleAskDelete = useCallback((job: CronJob) => {
    setDeleteTarget(job);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/crons?id=${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast(`Cron "${deleteTarget.name}" deleted`);
        setDeleteTarget(null);
        await fetchJobs();
      } else {
        showToast(data.error || "Delete failed", "error");
      }
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, fetchJobs, showToast]);

  const handleSaved = useCallback(async (saved: CronJob) => {
    showToast(editingJob && editingJob.id ? "Cron updated" : "Cron created");
    setEditingJob(null);
    await fetchJobs();
    // Pulse highlight 3s
    if (saved.id) {
      setHighlightedId(saved.id);
      setTimeout(() => setHighlightedId(null), 3000);
    }
  }, [editingJob, fetchJobs, showToast]);

  const handleSaveHeartbeat = useCallback(async () => {
    setSavingHeartbeat(true);
    try {
      await fetch("/api/heartbeat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: heartbeat }),
      });
      showToast("HEARTBEAT.md saved");
      setAdvancedOpen(false);
    } catch (err) {
      console.error("Failed to save heartbeat:", err);
      showToast("Save failed", "error");
    } finally {
      setSavingHeartbeat(false);
    }
  }, [heartbeat, showToast]);

  // Sort jobs by next run (ascending). file-first when equal.
  const sortedJobs = useMemo(() => {
    const withNext = jobs.map((j) => {
      let next: number = Number.MAX_SAFE_INTEGER;
      if (j.enabled) {
        try {
          next = CronExpressionParser.parse(j.schedule).next().getTime();
        } catch { /* invalid schedule, keep MAX */ }
      }
      return { job: j, next };
    });
    withNext.sort((a, b) => a.next - b.next);
    return withNext.map((w) => w.job);
  }, [jobs]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary">Loading crons...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-10 items-center justify-between px-4">
        <h2 className="text-sm font-semibold text-text-primary">
          Cron Jobs ({jobs.filter((j) => j.enabled).length} active)
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleNew}
            className="bg-violet text-white hover:bg-violet/90"
          >
            + New cron
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdvancedOpen(true)}
            className="border-violet-dim text-text-secondary hover:text-text-body"
          >
            Advanced
          </Button>
        </div>
      </div>
      <Separator className="bg-violet-dim" />

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 p-4">
          {sortedJobs.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="text-4xl">⏰</div>
              <p className="text-sm text-text-secondary">No cron jobs yet</p>
              <p className="text-xs text-text-secondary/60">
                Schedule a prompt to run automatically.
              </p>
              <Button
                onClick={handleNew}
                className="mt-2 bg-violet text-white hover:bg-violet/90"
              >
                + Create your first cron
              </Button>
            </div>
          )}
          {sortedJobs.map((job) => (
            <CronCard
              key={job.id}
              job={job}
              logs={logs[job.id] ?? []}
              onRunNow={handleRunNow}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleAskDelete}
              onDuplicate={handleDuplicate}
              runningId={runningId}
              highlighted={highlightedId === job.id}
            />
          ))}
        </div>
      </div>

      {/* Form sheet (create / edit / duplicate) */}
      <CronFormSheet
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditingJob(null);
        }}
        initialJob={editingJob && editingJob.id ? editingJob : editingJob /* duplicate path: id=0 sera tratado como create */}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <DeleteCronDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        jobName={deleteTarget?.name ?? ""}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
      />

      {/* Advanced sheet (raw HEARTBEAT.md editor) */}
      <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <SheetContent side="right" className="w-full max-w-xl overflow-y-auto bg-deep-space border-violet-dim">
          <SheetHeader>
            <SheetTitle className="text-text-primary">Advanced: HEARTBEAT.md</SheetTitle>
            <SheetDescription className="text-text-secondary">
              Raw editor for HEARTBEAT.md. Changes here hot-reload the file-origin cron jobs.
              Dashboard-created jobs (db-origin) are unaffected.
            </SheetDescription>
          </SheetHeader>
          <Separator className="bg-violet-dim" />
          <div className="p-4">
            <Textarea
              value={heartbeat}
              onChange={(e) => setHeartbeat(e.target.value)}
              disabled={savingHeartbeat}
              className="min-h-[500px] resize-y border-violet-dim bg-night-panel font-mono text-xs text-text-body focus-visible:ring-violet"
              aria-label="Edit HEARTBEAT.md"
            />
          </div>
          <SheetFooter>
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                onClick={() => setAdvancedOpen(false)}
                disabled={savingHeartbeat}
                className="flex-1 border-violet-dim text-text-secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveHeartbeat}
                disabled={savingHeartbeat}
                className="flex-1 bg-violet text-white hover:bg-violet/90"
              >
                {savingHeartbeat ? "Saving..." : "Save"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[100] rounded-md border px-4 py-2 text-xs shadow-lg ${
            toast.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
              : "border-red-500/30 bg-red-500/20 text-red-300"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
```

Notas importantes para o implementador:

1. **Duplicate path**: Quando `handleDuplicate` e chamado, `editingJob` e setado com `id: 0`. O `CronFormSheet` (plano 05) usa `isEdit = Boolean(initialJob?.id)` — como `id=0` e falsy, o sheet trata como CREATE mas com campos pre-preenchidos. Funciona corretamente.

2. **initialJob prop passing**: O comentario inline no JSX explica. Passa o `editingJob` direto — o sheet lida com id=0 corretamente.

3. **Sort por proximo disparo**: `useMemo` calcula o proximo disparo de cada cron via `cron-parser`. Disabled jobs vao pro final. Invalid schedules (erro de parse) tambem vao pro final.

4. **Import de cron-parser**: Este arquivo agora precisa de cron-parser (instalado no plano 05). O package ja esta disponivel.

5. **Toast**: simples state local + setTimeout. Sem lib nova.

6. **Advanced sheet**: substitui o editor fixo da direita. O layout muda de `flex h-full` row para `flex h-full flex-col` — a lista agora ocupa a largura toda.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit && bun run -C /home/projects/ForgeClaw/packages/dashboard lint</automated>
</verify>
<done>Compila. ESLint passa. CronsTab tem botao New cron, Advanced sheet, empty state acionavel, CronFormSheet wireado, DeleteCronDialog wireado, pulse highlight apos save, toast, ordenacao por proximo disparo.</done>
</task>

## Criterios de Sucesso

- [ ] `packages/dashboard` compila sem erros
- [ ] Botao "+ New cron" visivel no topo da aba Crons
- [ ] Clicar "+ New cron" abre CronFormSheet em modo create
- [ ] Cards exibem badge file/db
- [ ] Edit abre o form em modo edit com campos preenchidos (apenas db-origin)
- [ ] Duplicate abre o form em create com campos copiados + nome " (copy)"
- [ ] Delete abre modal nomeado, confirmar deleta via `DELETE /api/crons?id=X` e refetcha
- [ ] File-origin tem Edit/Delete desabilitados com tooltip
- [ ] Empty state mostra botao "Create your first cron"
- [ ] Editor raw HEARTBEAT.md acessivel apenas via botao "Advanced" (Sheet)
- [ ] Pulse 3s no card apos save
- [ ] Toast de sucesso/erro visivel 3s
- [ ] Lista ordenada por proximo disparo (cron-parser)
