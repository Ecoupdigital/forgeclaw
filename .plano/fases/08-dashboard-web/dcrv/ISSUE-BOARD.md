---
cycle: 1
timestamp: 2026-04-11
scope: phase
phase: 08-dashboard-web
subrecorte: DASH-04
raw_total: 49
after_dedup: 27
critical: 4
high: 11
medium: 9
low: 3
to_fix: 15
deferred: 12
---

# DCRV Issue Board — Ciclo 1

## Consolidation Summary

Raw detector output: 49 issues (19 visual + 12 API + 18 exhaustive)
After dedup: 27 unique issues consolidated into 6 fix groups

**Heavy overlap detected:**
- `DCRV-API-001` ↔ `BACKEND-001` (toggle origin check) — SAME BUG
- `DCRV-API-006` ↔ `BACKEND-016` (POST accepts origin=file) — SAME BUG
- `DCRV-API-004` ↔ `BACKEND-004` (schedule "foo bar") — SAME BUG
- `DCRV-API-002/003/005` ↔ `BACKEND-003/005` (POST validation gaps) — OVERLAP
- `DCRV-API-009/010/012` ↔ `BACKEND-007/008/009/010/011` (PUT silent success) — OVERLAP
- `VIS-014` ↔ `FRONTEND-004` (Run now toast) — SAME BUG

## Fix Groups (max 15 to fix this cycle)

| Group | Sev | Area | Consolidates | What to fix |
|-------|-----|------|--------------|-------------|
| **G1** | critical | POST /api/crons hardening | API-002/003/004/005/006/007 + BACKEND-003/004/005/006/011/016 + BACKEND-002 | Zod schema on POST (name/schedule/prompt/targetTopicId/enabled/origin). Validate schedule with CronExpressionParser. Hard-code `origin:'db'`, `sourceFile:null` — ignore body fields. Length caps: name<=100, prompt<=5000. Remove mock-id fallback — return 400 on core failure. Reject array/non-object body. |
| **G2** | critical | PUT /api/crons hardening | API-001/009/010/012 + BACKEND-001/007/008/009/010 | Move `existing = core.getCronJob(id)` to top of handler. Return 404 if missing. Return 403 on `existing.origin==='file'` for BOTH `toggle` AND `update`. Validate `action` against known set, return 400 on unknown. Remove `source:'mock'` catch-all fallback. Require `id` to be number at top. |
| **G3** | critical | PUT /api/heartbeat hardening | BACKEND-012/013/014 | Top-level: `if (typeof content !== 'string') return 400`. Reject empty/whitespace-only with explicit 400 (don't let user accidentally wipe file). Cap `content.length <= 64*1024`. Frontend `handleSaveHeartbeat` shows confirm dialog if `heartbeat.trim() === ''`. |
| **G4** | critical | Card primitive border dead code | VIS-001 | `packages/dashboard/src/components/ui/card.tsx:15` uses `ring-1 ring-foreground/10` — `border-violet-dim` className is dead code. Fix: update primitive to `border border-border` OR change `cron-card.tsx:50` to use `ring-violet-dim` / `hover:ring-violet-glow`. |
| **G5** | high | Mobile 375px overflow | VIS-003 | Header `h-10 flex justify-between` → `flex-col sm:flex-row gap-2`. Card actions `flex flex-wrap` → `grid grid-cols-2 sm:grid-cols-4 gap-2`. Badges container `flex flex-wrap gap-1.5`. Empty state button w-full in mobile. |
| **G6** | high | 7 identical buttons no hierarchy | VIS-002 | Refactor `cron-card.tsx` actions: keep Run now + View logs + Pause/Resume as main row (icons + labels), collapse Edit/Duplicate/Delete into a single `[⋯]` dropdown. Use lucide icons. |
| **G7** | high | Dialog overlay almost invisible | VIS-004 | `ui/dialog.tsx` DialogOverlay: `bg-black/60 backdrop-blur-sm`. |
| **G8** | high | Skills helper covers form sheet | VIS-006 | Replace second `Sheet side="right"` with either (a) Popover anchored to link, or (b) inline expandable section below Prompt textarea. Popover preferred. |
| **G9** | high | Pause/Resume not disabled on file-origin + no error handling | FRONTEND-005 + FRONTEND-006 | `cron-card.tsx`: add `disabled={isFileOrigin}` to toggle button with tooltip. `crons-tab.tsx handleToggle`: wrap fetch in try/catch + `res.ok` check + rollback state + error toast. |
| **G10** | high | Native checkbox destoa do theme | VIS-007 | Replace `<input type=checkbox>` in form sheet with shadcn Switch component (semantically better for "Enabled"). Install if needed: `bunx shadcn@latest add switch`. |
| **G11** | high | WCAG AA contrast failures | VIS-008/009/010 | `cron-form-sheet.tsx:307`: drop `/70`. `cron-form-sheet.tsx:351,355`: drop `/60`. `crons-tab.tsx:289`: drop `/60`. Use plain `text-text-secondary`. |
| **G12** | high | Mobile delete dialog button order | VIS-005 | `delete-cron-dialog.tsx` DialogFooter: `flex flex-col-reverse sm:flex-row gap-2` — Cancel appears first (top) on mobile, Delete second (destructive action never first-touch). |
| **G13** | high | targetTopicId not validated | DCRV-API-011 | In POST/PUT hardening (G1/G2), add `if (targetTopicId != null && !core.getTopic(targetTopicId)) return 400`. |
| **G14** | high | Run now no success toast | VIS-014 + FRONTEND-004 | `crons-tab.tsx handleRunNow`: immediate `showToast('Triggering cron...')` on click before awaiting. Success branch also calls toast. |
| **G15** | medium | Emoji in empty state destoa do theme | VIS-011 | Replace `⏰` with `<AlarmClock className="h-14 w-14 text-violet/60" />` from lucide-react. |

## Deferred to future cycles or out of scope

| ID | Sev | Motivo |
|----|-----|--------|
| VIS-012 | medium | Title hierarchy (14px vs 14px) — polish, no UX harm |
| VIS-013 | medium | 3 badges per card density — addressed partially by G6 refactor |
| VIS-015 | medium | Header `h-10` fixed — addressed by G5 responsive refactor |
| VIS-016 | medium | Native `title=""` tooltips — shadcn Tooltip install is its own feature |
| DCRV-API-008 | medium | Content-Type text/plain accepted — low-risk, not a real vuln |
| BACKEND-015 | low | `GET /api/crons/0/logs` returns empty — edge case |
| VIS-017 | low | `/crons` has no nav shell — OUT OF SCOPE (project-wide pattern) |
| VIS-018 | low | Next devtools indicator — DEV ONLY |
| VIS-019 | low | Ad-hoc `text-[10px]`/`text-[11px]` — polish |

## Dispatcher Routing

| Group | Specialist | Files |
|-------|-----------|-------|
| G1, G2, G3, G13 | up-backend-specialist | `packages/dashboard/src/app/api/crons/route.ts`, `packages/dashboard/src/app/api/heartbeat/route.ts` |
| G3 (frontend part), G5, G6, G7, G8, G9, G10, G11, G12, G14, G15 | up-frontend-specialist | `packages/dashboard/src/components/crons-tab.tsx`, `cron-card.tsx`, `cron-form-sheet.tsx`, `delete-cron-dialog.tsx`, `ui/card.tsx`, `ui/dialog.tsx`, potentially new `ui/switch.tsx`, `ui/popover.tsx` |
| G4 | up-frontend-specialist | `packages/dashboard/src/components/ui/card.tsx` OR `cron-card.tsx` |
