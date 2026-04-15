---
phase: 16-ux-improvements
plan: 16-02
type: feature
autonomous: true
wave: 1
depends_on: []
requirements: [HIG-H8]
must_haves:
  truths:
    - "User can search memory entries by text using FTS5"
    - "Memory entries are paginated with Load More button"
    - "Search works across active, pending, and archived tabs"
  artifacts:
    - path: "packages/dashboard/src/lib/core.ts"
      provides: "searchMemoryEntriesV2() FTS5 search wrapper"
    - path: "packages/dashboard/src/app/api/memory/entries/route.ts"
      provides: "GET with ?q=search&limit=50&offset=0 query params"
    - path: "packages/dashboard/src/components/memory-tab.tsx"
      provides: "Search input + Load More pagination"
  key_links:
    - from: "memory-tab.tsx"
      to: "api/memory/entries"
      via: "fetch with q/limit/offset query params"
    - from: "api/memory/entries"
      to: "core.ts searchMemoryEntriesV2"
      via: "direct function call when q param present"
---

# Fase 16 Plano 02: Memory Search + Pagination (H8)

**Objetivo:** Adicionar busca por texto (FTS5) e paginacao ao memory tab do dashboard. Atualmente o tab carrega todas as entries de uma vez sem filtro de texto. O backend ja tem FTS5 via `memory_fts` virtual table e `searchMemoryEntries()` em state-store.ts, mas o dashboard wrapper (`core.ts`) nao expoe busca, e a API nao aceita parametros de search/pagination.

## Contexto

@packages/core/src/state-store.ts — searchMemoryEntries() usa memory_fts FTS5 (linha 884-916), sanitizeFtsQuery() (linha 1028-1037)
@packages/dashboard/src/lib/core.ts — listMemoryEntriesV2() sem search, sem offset
@packages/dashboard/src/app/api/memory/entries/route.ts — GET sem q/offset params
@packages/dashboard/src/components/memory-tab.tsx — sem search input, sem pagination

## Tarefas

<task id="1" type="auto">
<files>packages/dashboard/src/lib/core.ts</files>
<action>
Adicionar funcao `searchMemoryEntriesV2()` e adicionar `offset` a `listMemoryEntriesV2()`:

1. **Adicionar offset a listMemoryEntriesV2:**
   Modificar a funcao `listMemoryEntriesV2` (linha ~490) para aceitar `offset?: number` no opts:
   ```typescript
   export function listMemoryEntriesV2(
     opts: {
       kind?: string;
       reviewStatus?: "approved" | "pending" | "all";
       includeArchived?: boolean;
       limit?: number;
       offset?: number;  // ADD THIS
     } = {},
   ): MemoryEntryDTO[] | null {
   ```
   Antes do `const rows = d.prepare(...)`, adicionar:
   ```typescript
   const offset = opts.offset ?? 0;
   values.push(offset);
   ```
   Modificar a query SQL para incluir `OFFSET ?` apos o `LIMIT ?`:
   ```sql
   SELECT ... FROM memory_entries WHERE ${parts.join(" AND ")}
   ORDER BY pinned DESC, reviewed DESC, updated_at DESC LIMIT ? OFFSET ?
   ```
   Note: `limit` ja e pushado em values. Adicionar `offset` APOS o push de `limit`.

2. **Adicionar funcao searchMemoryEntriesV2:**
   Adicionar APOS `listMemoryEntriesV2`:
   ```typescript
   /**
    * FTS5 full-text search across memory entries.
    * Mirrors stateStore.searchMemoryEntries() but uses better-sqlite3.
    */
   export function searchMemoryEntriesV2(
     query: string,
     opts: {
       reviewStatus?: "approved" | "pending" | "all";
       includeArchived?: boolean;
       limit?: number;
       offset?: number;
     } = {},
   ): MemoryEntryDTO[] | null {
     const d = getDb();
     if (!d) return null;

     const safeQuery = sanitizeFtsQuery(query);
     if (!safeQuery) return null;

     try {
       const parts: string[] = [
         "m.user_id = 'default'",
         "m.workspace_id = 'default'",
       ];
       const reviewStatus = opts.reviewStatus ?? "approved";
       if (reviewStatus === "approved") parts.push("m.reviewed = 1");
       else if (reviewStatus === "pending") parts.push("m.reviewed = 0");
       if (!opts.includeArchived) parts.push("m.archived_at IS NULL");

       const limit = opts.limit ?? 50;
       const offset = opts.offset ?? 0;

       const rows = d
         .prepare(
           `SELECT m.id, m.user_id, m.workspace_id, m.kind, m.content, m.content_hash,
                   m.source_type, m.source_session_id, m.created_at, m.updated_at,
                   m.last_accessed_at, m.access_count, m.pinned, m.archived_at,
                   m.metadata, m.reviewed, m.confidence
            FROM memory_fts
            JOIN memory_entries m ON m.id = memory_fts.rowid
            WHERE memory_fts MATCH ?
              AND ${parts.join(" AND ")}
            ORDER BY bm25(memory_fts) LIMIT ? OFFSET ?`,
         )
         .all(safeQuery, limit, offset) as MemoryRow[];
       return rows.map(mapMemRow);
     } catch (err) {
       console.warn("[core-wrapper] FTS5 memory search failed:", err);
       return null;
     }
   }
   ```

3. **Adicionar funcao sanitizeFtsQuery (copiar de state-store.ts):**
   Adicionar ANTES de searchMemoryEntriesV2:
   ```typescript
   function sanitizeFtsQuery(query: string): string {
     if (!query) return "";
     const tokens = query
       .toLowerCase()
       .replace(/[^\p{L}\p{N}\s]/gu, " ")
       .split(/\s+/)
       .filter((t) => t.length >= 2);
     if (tokens.length === 0) return "";
     return tokens.map((t) => `"${t}"`).join(" OR ");
   }
   ```

Resumo das mudancas:
- `listMemoryEntriesV2`: adicionar param `offset` e `OFFSET ?` na query
- Nova funcao `sanitizeFtsQuery` (copiada do core)
- Nova funcao `searchMemoryEntriesV2` usando FTS5 via better-sqlite3
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 | head -30</automated>
</verify>
<done>core.ts expoe searchMemoryEntriesV2() com FTS5 e listMemoryEntriesV2() com offset. Ambas funcoes usam better-sqlite3 diretamente.</done>
</task>

<task id="2" type="auto">
<files>packages/dashboard/src/app/api/memory/entries/route.ts</files>
<action>
Modificar o GET handler para aceitar query params `q`, `offset`:

1. Adicionar import de `searchMemoryEntriesV2` no topo:
   ```typescript
   import * as core from "@/lib/core";
   ```
   (ja importado — `searchMemoryEntriesV2` estara disponivel via `core.searchMemoryEntriesV2`)

2. No GET handler, apos as linhas que extraem os search params existentes, adicionar:
   ```typescript
   const q = url.searchParams.get("q")?.trim() ?? "";
   const offset = Number(url.searchParams.get("offset") ?? "0");
   ```

3. Adicionar branch condicional: se `q` tiver conteudo, usar search; senao, usar list:
   ```typescript
   if (q.length >= 2) {
     const results = core.searchMemoryEntriesV2(q, {
       reviewStatus,
       includeArchived,
       limit,
       offset,
     });
     if (results === null) {
       return Response.json({ entries: [], source: "empty", total: 0 });
     }
     return Response.json({
       entries: results,
       source: "core",
       hasMore: results.length === limit,
     });
   }
   ```

4. Adicionar `offset` a chamada existente de `listMemoryEntriesV2`:
   ```typescript
   const entries = core.listMemoryEntriesV2({
     kind,
     reviewStatus,
     includeArchived,
     limit,
     offset,
   });
   ```

5. Adicionar `hasMore` na response do list tambem:
   ```typescript
   return Response.json({
     entries: entries ?? [],
     source: entries ? "core" : "empty",
     hasMore: (entries?.length ?? 0) === limit,
   });
   ```

Resultado: GET /api/memory/entries?q=claude&limit=50&offset=0&reviewStatus=approved retorna entries que matcham FTS5 search. Sem `q`, funciona como antes mas com offset.
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 | head -30</automated>
</verify>
<done>API aceita ?q=texto&offset=0&limit=50. Com q >= 2 chars usa FTS5, sem q usa listagem normal. Ambos suportam offset para paginacao.</done>
</task>

<task id="3" type="auto">
<files>packages/dashboard/src/components/memory-tab.tsx</files>
<action>
Adicionar search input e botao "Load more" ao memory tab:

1. **Adicionar state para search e pagination** (dentro do componente MemoryTab, apos os states existentes):
   ```typescript
   const [searchQuery, setSearchQuery] = useState("");
   const [debouncedQuery, setDebouncedQuery] = useState("");
   const [hasMore, setHasMore] = useState(false);
   const [loadingMore, setLoadingMore] = useState(false);
   const PAGE_SIZE = 50;
   ```

2. **Adicionar import `{ useRef }` ao import de React** (linha 3):
   ```typescript
   import { useState, useCallback, useEffect, useRef } from "react";
   ```

3. **Adicionar import de `Input` do shadcn** (apos os imports existentes):
   ```typescript
   import { Input } from "@/components/ui/input";
   ```

4. **Adicionar debounce effect** (apos os states):
   ```typescript
   useEffect(() => {
     const timer = setTimeout(() => {
       setDebouncedQuery(searchQuery);
     }, 300);
     return () => clearTimeout(timer);
   }, [searchQuery]);
   ```

5. **Modificar fetchActive** para usar search e limit/offset. Substituir a funcao `fetchActive` inteira (atualmente linhas 82-89):
   ```typescript
   const fetchActive = useCallback(async (append = false) => {
     const offset = append ? entries.length : 0;
     const kindParam = kindFilter === "all" ? "" : `&kind=${kindFilter}`;
     const searchParam = debouncedQuery.length >= 2 ? `&q=${encodeURIComponent(debouncedQuery)}` : "";
     const res = await fetch(
       `/api/memory/entries?reviewStatus=approved${kindParam}${searchParam}&limit=${PAGE_SIZE}&offset=${offset}`,
       { cache: "no-store" },
     );
     const d = await res.json();
     const newEntries = d.entries ?? [];
     setHasMore(d.hasMore ?? false);
     if (append) {
       setEntries((prev) => [...prev, ...newEntries]);
     } else {
       setEntries(newEntries);
     }
   }, [kindFilter, debouncedQuery, entries.length]);
   ```
   NOTA: `entries.length` na dependency array causa re-renders. Para evitar loops, usar ref:
   ```typescript
   const entriesCountRef = useRef(0);
   useEffect(() => { entriesCountRef.current = entries.length; }, [entries.length]);

   const fetchActive = useCallback(async (append = false) => {
     const offset = append ? entriesCountRef.current : 0;
     const kindParam = kindFilter === "all" ? "" : `&kind=${kindFilter}`;
     const searchParam = debouncedQuery.length >= 2 ? `&q=${encodeURIComponent(debouncedQuery)}` : "";
     const res = await fetch(
       `/api/memory/entries?reviewStatus=approved${kindParam}${searchParam}&limit=${PAGE_SIZE}&offset=${offset}`,
       { cache: "no-store" },
     );
     const d = await res.json();
     const newEntries = d.entries ?? [];
     setHasMore(d.hasMore ?? false);
     if (append) {
       setEntries((prev) => [...prev, ...newEntries]);
     } else {
       setEntries(newEntries);
     }
   }, [kindFilter, debouncedQuery]);
   ```

6. **Adicionar efeito para reset quando query ou kindFilter muda**:
   ```typescript
   useEffect(() => {
     if (activeTab === "active") void fetchActive(false);
   }, [activeTab, fetchActive, debouncedQuery, kindFilter]);
   ```
   Remover o useEffect existente que faz a mesma coisa (linhas 143-145 do original).

7. **Adicionar handler loadMore**:
   ```typescript
   const loadMore = async () => {
     setLoadingMore(true);
     await fetchActive(true);
     setLoadingMore(false);
   };
   ```

8. **Adicionar search input na UI**. Na secao `{activeTab === "active" && ...}`, ANTES dos kind filter buttons, adicionar:
   ```tsx
   <Input
     type="search"
     placeholder="buscar memories (FTS5)..."
     value={searchQuery}
     onChange={(e) => setSearchQuery(e.target.value)}
     className="border-violet-dim bg-night-panel text-text-body placeholder:text-text-secondary/60"
   />
   ```

9. **Adicionar botao "Load more" apos a lista de entries** (dentro do `{activeTab === "active" && ...}`, apos o map de entries):
   ```tsx
   {hasMore && (
     <div className="flex justify-center pt-2">
       <Button
         size="xs"
         variant="outline"
         onClick={loadMore}
         disabled={loadingMore}
         className="border-violet-dim text-violet hover:bg-violet/10"
       >
         {loadingMore ? "loading..." : `load more (showing ${entries.length})`}
       </Button>
     </div>
   )}
   ```

10. **Mostrar contagem com info de search**. Na area de "nenhum entry":
    ```tsx
    {entries.length === 0 ? (
      <p className="py-6 text-center text-sm text-text-secondary">
        {debouncedQuery
          ? `nenhum resultado para "${debouncedQuery}"`
          : `nenhum entry ${kindFilter !== "all" ? `de kind=${kindFilter}` : ""}`}
      </p>
    ) : (
      entries.map((e) => renderEntryCard(e, { showActions: "active" }))
    )}
    ```
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 | head -30</automated>
</verify>
<done>Memory tab tem search input com debounce de 300ms que usa FTS5. Paginacao via "Load more" button carrega proximas 50 entries. Search vazio mostra listagem normal paginada.</done>
</task>

<task id="4" type="checkpoint:human-verify">
<files>packages/dashboard/src/components/memory-tab.tsx</files>
<action>
Verificacao visual no dashboard:
1. Abrir aba Memory
2. Digitar termo de busca no input — deve filtrar apos 300ms
3. Limpar busca — deve voltar a listagem completa
4. Se houver mais de 50 entries, botao "load more" deve aparecer
5. Trocar kind filter com busca ativa — deve combinar filtros
</action>
<verify>
  <automated>cd /home/projects/ForgeClaw && npx tsc --noEmit --project packages/dashboard/tsconfig.json 2>&1 | head -10</automated>
</verify>
<done>Search + pagination funcionam visualmente. FTS5 retorna resultados corretos. Load more carrega paginas adicionais.</done>
</task>

## Criterios de Sucesso

- [ ] Search input no memory tab com debounce 300ms
- [ ] FTS5 search funciona via API com parametro ?q=
- [ ] Paginacao com limit=50 e botao "Load more"
- [ ] Busca combina com filtro de kind
- [ ] Mensagem "nenhum resultado" quando search nao encontra nada
- [ ] TypeScript compila sem erros
