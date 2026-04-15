---
phase: 08-dashboard-web
plan: 08-02
type: feature
autonomous: true
wave: 1
depends_on: []
requirements: [DASH-04]
files_modified:
  - packages/dashboard/src/app/api/skills/route.ts
  - packages/dashboard/src/app/api/topics/route.ts
  - packages/dashboard/src/lib/core.ts
  - packages/dashboard/src/lib/types.ts
must_haves:
  truths:
    - "GET /api/skills retorna lista de skills de ~/.claude/skills/ com name e description"
    - "GET /api/topics retorna lista de topics do DB com id, name, chatId"
    - "Ambos endpoints retornam 200 com array (mesmo vazio) em situacao normal"
    - "Endpoints sao baratos o suficiente para rodar sincrono na abertura do form (cache in-memory 30s)"
  artifacts:
    - path: "packages/dashboard/src/app/api/skills/route.ts"
      provides: "Endpoint GET que le ~/.claude/skills/ via fs.readdir, parseia YAML frontmatter, retorna [{name, description}]"
    - path: "packages/dashboard/src/app/api/topics/route.ts"
      provides: "Endpoint GET que chama core.listTopics() e retorna [{id, name, chatId, threadId}]"
    - path: "packages/dashboard/src/lib/types.ts"
      provides: "Tipo SkillInfo exportado"
  key_links:
    - from: "CronFormSheet (plano 05)"
      to: "/api/skills"
      via: "fetch no mount para popular sheet lateral de helper"
    - from: "CronFormSheet (plano 05)"
      to: "/api/topics"
      via: "fetch no mount para popular dropdown de target topic"
---

# Fase 8 Plano 02: Endpoints /api/skills e /api/topics

**Objetivo:** Criar os dois endpoints read-only que o form de criacao de crons (plano 05) consome: (1) `/api/skills` que le `~/.claude/skills/` e expoe a lista para o helper visual no textarea de prompt, e (2) `/api/topics` que retorna os topics existentes no DB para o dropdown de "Target topic". Ambos independentes dos outros planos desta onda — podem rodar em paralelo com plano 01.

## Research

**Next.js docs consultados:**
- `packages/dashboard/node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` — confirma padrao atual: `export async function GET(request: Request) { return Response.json(...) }`. Sem mudanca de API em relacao ao Next 15.
- `packages/dashboard/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — confirma que `app/api/<name>/route.ts` e a convencao correta. Por padrao route handlers nao cacheiam (apenas GET opt-in via `export const dynamic = 'force-static'`).
- Decisao: NAO usar `force-static`. Os dados sao dinamicos (skills/topics mudam em runtime). Manter default dinamico, adicionar cache in-memory simples de 30s no handler para evitar re-leitura em cada keystroke do form.

**Decisoes travadas do CONTEXT.md honradas:**
- `decisions > Skills no prompt`: "Endpoint novo `GET /api/skills` le `~/.claude/skills/` dinamicamente e retorna lista com `name` e `description`".
- `decisions > Criterio do Claude`: "Estrutura do endpoint `/api/skills` (cache, TTL, formato exato da resposta) — livre, mas deve ser rapido." → Escolha: cache in-memory 30s, formato `{ skills: SkillInfo[], source: 'fs' }`.
- `decisions > Campos do form > Target topic`: "dropdown dos topics conhecidos do DB (tabela `topics`)". Nao existe endpoint `/api/topics` ainda — criar.

**Achados do codebase:**
- `packages/dashboard/src/lib/core.ts` ja exporta `listTopics()` (linhas 185-198). Basta wrap em route handler.
- `~/.claude/skills/` tem estrutura mista: subdirs com `SKILL.md` dentro (ex: `apify/`, `asaas-api/`) E arquivos `.md` soltos (ex: `buscar-x.md`, `Chat para LLMs.md`). O endpoint deve suportar ambos.
- YAML frontmatter parsing: o CONTEXT diz "parsing do YAML frontmatter" mas Next.js 16 + dashboard package nao tem `gray-matter` ou `yaml` instalado. Para evitar nova dep, usar regex simples para extrair `name:` e `description:` das primeiras 20 linhas (suficiente — frontmatter padrao).

## Contexto

@packages/dashboard/src/app/api/sessions/route.ts — padrao de route handler com fallback para mock
@packages/dashboard/src/lib/core.ts — `listTopics()` (linhas 185-198) e disponivel
@packages/dashboard/src/lib/types.ts — local onde adicionar `SkillInfo`
@packages/dashboard/node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md — padrao de GET handler

## Tarefas

<task id="1" type="auto">
<files>packages/dashboard/src/lib/types.ts</files>
<action>
Adicionar tipo `SkillInfo` ao final do arquivo (apos `PlanCard`, linha 77):

```typescript
export interface SkillInfo {
  name: string;
  description: string;
  source: string; // path relativo, ex: "apify/SKILL.md" ou "buscar-x.md"
}
```
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit src/lib/types.ts</automated>
</verify>
<done>Interface SkillInfo exportada. Compila.</done>
</task>

<task id="2" type="auto">
<files>packages/dashboard/src/app/api/skills/route.ts</files>
<action>
Criar novo route handler. Arquivo inteiro:

```typescript
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import type { SkillInfo } from "@/lib/types";

const SKILLS_DIR = join(homedir(), ".claude", "skills");
const CACHE_TTL_MS = 30_000;

let cache: { at: number; data: SkillInfo[] } | null = null;

function parseFrontmatter(content: string): { name?: string; description?: string } {
  // Pega as primeiras ~25 linhas procurando um bloco --- ... ---
  const head = content.split("\n").slice(0, 30).join("\n");
  const match = head.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const block = match[1];
  const name = block.match(/^name\s*:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, "");
  const description = block.match(/^description\s*:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, "");
  return { name, description };
}

async function readSkillFromFile(filePath: string, relPath: string): Promise<SkillInfo | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const fm = parseFrontmatter(content);
    // Fallback: se nao tem name, deriva do nome do arquivo
    const fallbackName = relPath.replace(/\.md$/, "").replace(/\/SKILL$/, "").replace(/\//g, " / ");
    return {
      name: fm.name?.trim() || fallbackName,
      description: fm.description?.trim() || "",
      source: relPath,
    };
  } catch {
    return null;
  }
}

async function loadSkills(): Promise<SkillInfo[]> {
  if (!existsSync(SKILLS_DIR)) return [];

  const result: SkillInfo[] = [];
  let entries: string[];
  try {
    entries = await readdir(SKILLS_DIR);
  } catch {
    return [];
  }

  for (const entry of entries) {
    const full = join(SKILLS_DIR, entry);
    let st;
    try { st = await stat(full); } catch { continue; }

    if (st.isDirectory()) {
      // Procura SKILL.md dentro
      const skillFile = join(full, "SKILL.md");
      if (existsSync(skillFile)) {
        const skill = await readSkillFromFile(skillFile, `${entry}/SKILL.md`);
        if (skill) result.push(skill);
      }
    } else if (st.isFile() && entry.endsWith(".md")) {
      const skill = await readSkillFromFile(full, entry);
      if (skill) result.push(skill);
    }
  }

  // Ordena alfabeticamente por name
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return Response.json({ skills: cache.data, source: "cache" });
  }
  try {
    const skills = await loadSkills();
    cache = { at: now, data: skills };
    return Response.json({ skills, source: "fs" });
  } catch (err) {
    return Response.json(
      { skills: [], source: "error", error: err instanceof Error ? err.message : "Unknown error" },
      { status: 200 } // Nao falhar o request — o form degrada graciosamente
    );
  }
}
```

Notas:
- `existsSync(SKILLS_DIR)` retornando false retorna array vazio (nao quebra o form — usuario pode nao ter skills).
- Cache por modulo (in-memory do processo Next). 30s e suficiente para 1 form session.
- Erros de parsing individuais sao ignorados (continua pro proximo skill).
- Nao depende de plano 01.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit src/app/api/skills/route.ts</automated>
</verify>
<done>Arquivo existe. Compila. `curl http://localhost:4040/api/skills` (quando dev rodando) retorna `{skills: [...], source: "fs"}` com entradas para skills existentes em `~/.claude/skills/`.</done>
</task>

<task id="3" type="auto">
<files>packages/dashboard/src/app/api/topics/route.ts</files>
<action>
Criar novo route handler que wrap `core.listTopics()`. Arquivo inteiro:

```typescript
import * as core from "@/lib/core";

export async function GET() {
  try {
    const topics = core.listTopics();
    if (topics) {
      // Projeta apenas campos necessarios pro dropdown
      const slim = topics.map((t) => ({
        id: t.id,
        name: t.name ?? `Topic #${t.id}`,
        chatId: t.chatId,
        threadId: t.threadId,
      }));
      return Response.json({ topics: slim, source: "core" });
    }
  } catch (err) {
    console.warn("[api/topics] Core unavailable:", err);
  }
  return Response.json({ topics: [], source: "empty" });
}
```

Notas:
- Se nao tem DB, retorna array vazio. O form (plano 05) lidar com empty state ("Default (use harness default)" sera a unica opcao visivel).
- Nao ha POST/PUT/DELETE — topics sao criados pelo bot quando usuario manda mensagem num topico novo. Dashboard nao cria topics nesta fase.
- Nao depende de plano 01.
</action>
<verify>
<automated>cd /home/projects/ForgeClaw/packages/dashboard && bunx tsc --noEmit src/app/api/topics/route.ts</automated>
</verify>
<done>Arquivo existe. Compila. `curl http://localhost:4040/api/topics` retorna `{topics: [...]}`.</done>
</task>

## Criterios de Sucesso

- [ ] `packages/dashboard` compila sem erro apos as 3 tarefas
- [ ] GET /api/skills retorna 200 com lista (ou vazia) mesmo sem ~/.claude/skills/ presente
- [ ] GET /api/skills processa subdirs com SKILL.md e .md soltos
- [ ] Cache 30s funciona (2a request em seguida retorna `source: "cache"`)
- [ ] GET /api/topics retorna 200 com lista (ou vazia)
- [ ] SkillInfo exportado em lib/types.ts
