---
phase: 16-ux-improvements
plan: 16-01
type: fix
autonomous: true
wave: 1
depends_on: []
requirements: [HIG-H7]
must_haves:
  truths:
    - "Cron log output is visible in the dashboard with collapsible/expandable UI"
    - "Long outputs are truncated by default with expand toggle"
    - "Running status logs are excluded from display (only finished logs shown)"
  artifacts:
    - path: "packages/dashboard/src/components/cron-card.tsx"
      provides: "Collapsible output display for cron logs"
  key_links:
    - from: "cron-card.tsx"
      to: "api/crons/[id]/logs"
      via: "fetch in crons-tab.tsx passes logs as prop"
---

# Fase 16 Plano 01: Cron Output Display (H7)

**Objetivo:** Melhorar a exibicao de output dos cron logs no dashboard. O backend ja salva output corretamente (cron-engine.ts linhas 408-413) e a API ja retorna o campo `output` (core.ts getCronLogs). O componente cron-card.tsx ja renderiza `log.output` (linha 282), mas outputs longos nao tem truncamento nem expand/collapse, tornando a UI ilegivel para outputs grandes (ate 10KB).

## Contexto

@packages/core/src/cron-engine.ts — executeJob() salva output ate 10KB na cron_logs (linha 413)
@packages/dashboard/src/lib/core.ts — getCronLogs() ja retorna output field (linha 170-178)
@packages/dashboard/src/app/api/crons/[id]/logs/route.ts — API retorna logs com output
@packages/dashboard/src/components/cron-card.tsx — UI de logs na cron card
@packages/dashboard/src/components/crons-tab.tsx — fetchJobs carrega logs e filtra finishedAt

## Tarefas

<task id="1" type="auto">
<files>packages/dashboard/src/components/cron-card.tsx</files>
<action>
Modificar a secao de exibicao de logs no CronCard para ter output collapsible:

1. Adicionar import `{ ChevronDown, ChevronRight }` de `lucide-react` (ja existe import de lucide no arquivo)
2. Adicionar import `{ useState }` (ja importado)
3. Criar state `expandedLogIds` como `Set<number>` para rastrear quais logs estao expandidos:
   ```typescript
   const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());
   ```
4. Criar funcao toggle:
   ```typescript
   const toggleLogExpand = (logId: number) => {
     setExpandedLogIds((prev) => {
       const next = new Set(prev);
       if (next.has(logId)) next.delete(logId);
       else next.add(logId);
       return next;
     });
   };
   ```
5. Na secao onde `log.output` e renderizado (atualmente linha ~282, dentro do `{showLogs && ...}` block), substituir o bloco:
   ```tsx
   {log.output && (
     <p className="text-text-body whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
       {log.output}
     </p>
   )}
   ```
   Por:
   ```tsx
   {log.output && (
     <div className="mt-1">
       <button
         type="button"
         onClick={() => toggleLogExpand(log.id)}
         className="flex items-center gap-1 text-[10px] text-violet hover:text-violet/80"
       >
         {expandedLogIds.has(log.id) ? (
           <ChevronDown className="h-3 w-3" />
         ) : (
           <ChevronRight className="h-3 w-3" />
         )}
         output ({log.output.length} chars)
       </button>
       {expandedLogIds.has(log.id) && (
         <pre className="mt-1 max-h-64 overflow-auto rounded bg-black/30 p-2 text-text-body whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
           {log.output}
         </pre>
       )}
       {!expandedLogIds.has(log.id) && (
         <p className="mt-1 text-text-secondary font-mono text-[10px] truncate">
           {log.output.slice(0, 120)}{log.output.length > 120 ? "..." : ""}
         </p>
       )}
     </div>
   )}
   ```
6. Adicionar `ChevronDown, ChevronRight` ao import de lucide-react existente (linha 3-11 do arquivo original).

O resultado: cada log mostra uma preview truncada de 120 chars. Clicar "output (N chars)" expande/colapsa o output completo dentro de um `pre` com max-height 256px e scroll.
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 | head -30</automated>
</verify>
<done>Logs de cron exibem preview truncada de 120 chars por padrao. Botao expand/collapse mostra output completo em pre com scroll. Funciona para outputs de 0 a 10KB chars.</done>
</task>

<task id="2" type="auto">
<files>packages/dashboard/src/components/crons-tab.tsx</files>
<action>
Aumentar o limite de logs carregados por job e remover filtro desnecessario:

1. Na funcao `fetchJobs`, no `.slice(0, 5)` da linha 73, aumentar para `.slice(0, 10)` para mostrar mais historico.
2. O filtro `.filter((l) => l.finishedAt)` na linha 72 esta correto — manter para excluir "running" entries (que sao duplicatas do bug H2, nao corrigido aqui mas ja documentado).
3. Nenhuma outra mudanca necessaria neste arquivo.

Mudanca minima: apenas trocar o `5` por `10` no slice.
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 | head -30</automated>
</verify>
<done>Ate 10 logs recentes exibidos por cron card (antes era 5). Logs "running" continuam filtrados.</done>
</task>

<task id="3" type="checkpoint:human-verify">
<files>packages/dashboard/src/components/cron-card.tsx</files>
<action>
Verificacao visual: abrir o dashboard, ir na aba Crons, clicar "Logs" em um job que tenha execucoes. Confirmar:
1. Cada log mostra preview de ~120 chars em cinza
2. Clicar "output (N chars)" expande para pre scrollavel
3. Clicar novamente colapsa
4. Logs sem output nao mostram o botao expand
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 | head -10</automated>
</verify>
<done>Verificacao visual confirma: expand/collapse funciona, preview truncada visivel, scroll em outputs longos.</done>
</task>

## Criterios de Sucesso

- [ ] Logs de cron mostram preview truncada por padrao (120 chars)
- [ ] Botao expand/collapse funciona para cada log individualmente
- [ ] Outputs longos (ate 10KB) sao scrollaveis dentro de max-h-64
- [ ] Logs sem output nao mostram botao expand
- [ ] TypeScript compila sem erros
