"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useTimezone } from "@/hooks/use-timezone";

type Tab = "active" | "pending" | "archived" | "retrievals" | "audit";
type ReviewMode = "auto" | "hybrid" | "review";

interface MemoryEntry {
  id: number;
  kind: string;
  content: string;
  accessCount: number;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  sourceType: string | null;
  archivedAt: number | null;
  reviewed: boolean;
  confidence: number | null;
}

interface Retrieval {
  id: number;
  query: string;
  source: string;
  hits: Array<{ memoryId: number; score: number; reason: string; contentPreview?: string }>;
  injected: boolean;
  at: number;
}

interface AuditEntry {
  id: number;
  memoryId: number;
  action: string;
  oldContent: string | null;
  newContent: string | null;
  actor: string;
  reason: string | null;
  at: number;
}

const KINDS = ["all", "behavior", "user_profile", "fact", "decision", "preference"] as const;

export function MemoryTab() {
  const { formatTime } = useTimezone();
  const [activeTab, setActiveTab] = useState<Tab>("active");
  const tabLabels: Record<Tab, string> = {
    active: "ativas",
    pending: "pendentes",
    archived: "arquivadas",
    retrievals: "buscas",
    audit: "auditoria",
  };
  const [kindFilter, setKindFilter] = useState<(typeof KINDS)[number]>("all");

  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [pendingEntries, setPendingEntries] = useState<MemoryEntry[]>([]);
  const [archivedEntries, setArchivedEntries] = useState<MemoryEntry[]>([]);
  const [retrievals, setRetrievals] = useState<Retrieval[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const [reviewMode, setReviewMode] = useState<ReviewMode>("hybrid");
  const [approveThreshold, setApproveThreshold] = useState(85);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editKind, setEditKind] = useState<string>("fact");

  // Create state
  const [creating, setCreating] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newKind, setNewKind] = useState("fact");
  const [newPinned, setNewPinned] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 50;

  const entriesCountRef = useRef(0);
  useEffect(() => { entriesCountRef.current = entries.length; }, [entries.length]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- Fetchers ---

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

  const fetchPending = useCallback(async () => {
    const res = await fetch(`/api/memory/entries?reviewStatus=pending`, {
      cache: "no-store",
    });
    const d = await res.json();
    setPendingEntries(d.entries ?? []);
  }, []);

  const fetchArchived = useCallback(async () => {
    const res = await fetch(`/api/memory/entries?reviewStatus=all&archived=true`, {
      cache: "no-store",
    });
    const d = await res.json();
    setArchivedEntries((d.entries ?? []).filter((e: MemoryEntry) => e.archivedAt));
  }, []);

  const fetchRetrievals = useCallback(async () => {
    const res = await fetch("/api/memory/retrievals?limit=30", { cache: "no-store" });
    const d = await res.json();
    setRetrievals(d.retrievals ?? []);
  }, []);

  const fetchAudit = useCallback(async () => {
    const res = await fetch("/api/memory/audit?limit=50", { cache: "no-store" });
    const d = await res.json();
    setAudit(d.audit ?? []);
  }, []);

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/memory/config", { cache: "no-store" });
    const d = await res.json();
    setReviewMode(d.memoryReviewMode ?? "hybrid");
    setApproveThreshold(d.memoryAutoApproveThreshold ?? 85);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchActive(),
      fetchPending(),
      fetchArchived(),
      fetchRetrievals(),
      fetchAudit(),
      fetchConfig(),
    ]);
    setLoading(false);
  }, [fetchActive, fetchPending, fetchArchived, fetchRetrievals, fetchAudit, fetchConfig]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (activeTab === "active") void fetchActive(false);
  }, [activeTab, fetchActive, debouncedQuery, kindFilter]);

  const loadMore = async () => {
    setLoadingMore(true);
    await fetchActive(true);
    setLoadingMore(false);
  };

  // --- Mutations ---

  const saveReviewMode = async (mode: ReviewMode) => {
    setReviewMode(mode);
    await fetch("/api/memory/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memoryReviewMode: mode }),
    });
  };

  const approveEntry = async (id: number) => {
    await fetch(`/api/memory/entries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewed: true }),
    });
    await Promise.all([fetchPending(), fetchActive()]);
  };

  const rejectEntry = async (id: number) => {
    await fetch(`/api/memory/entries/${id}`, { method: "DELETE" });
    await Promise.all([fetchPending(), fetchArchived()]);
  };

  const approveAllPending = async () => {
    if (pendingEntries.length === 0) return;
    await Promise.all(
      pendingEntries.map((e) =>
        fetch(`/api/memory/entries/${e.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewed: true }),
        }),
      ),
    );
    await Promise.all([fetchPending(), fetchActive()]);
  };

  const rejectAllPending = async () => {
    if (pendingEntries.length === 0) return;
    if (!confirm(`Rejeitar ${pendingEntries.length} entries pendentes?`)) return;
    await Promise.all(
      pendingEntries.map((e) =>
        fetch(`/api/memory/entries/${e.id}`, { method: "DELETE" }),
      ),
    );
    await Promise.all([fetchPending(), fetchArchived()]);
  };

  const togglePin = async (entry: MemoryEntry) => {
    await fetch(`/api/memory/entries/${entry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !entry.pinned }),
    });
    await fetchActive();
  };

  const startEdit = (entry: MemoryEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
    setEditKind(entry.kind);
  };

  const saveEdit = async () => {
    if (editingId === null) return;
    await fetch(`/api/memory/entries/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent, kind: editKind }),
    });
    setEditingId(null);
    await Promise.all([fetchActive(), fetchPending()]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const archiveEntry = async (id: number) => {
    if (!confirm("Arquivar esse entry?")) return;
    await fetch(`/api/memory/entries/${id}`, { method: "DELETE" });
    await Promise.all([fetchActive(), fetchArchived()]);
  };

  const restoreEntry = async (id: number) => {
    await fetch(`/api/memory/entries/${id}/restore`, { method: "POST" });
    await Promise.all([fetchActive(), fetchArchived()]);
  };

  const createEntry = async () => {
    if (!newContent.trim()) return;
    await fetch("/api/memory/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: newKind,
        content: newContent.trim(),
        pinned: newPinned,
      }),
    });
    setNewContent("");
    setNewPinned(false);
    setCreating(false);
    await fetchActive();
  };

  // --- Render helpers ---

  const kindBadgeColor = (kind: string) => {
    const map: Record<string, string> = {
      behavior: "bg-violet/20 text-violet",
      user_profile: "bg-emerald-500/20 text-emerald-400",
      fact: "bg-blue-500/20 text-blue-400",
      decision: "bg-amber-500/20 text-amber-400",
      preference: "bg-pink-500/20 text-pink-400",
    };
    return map[kind] ?? "bg-gray-500/20 text-gray-400";
  };

  const renderEntryCard = (entry: MemoryEntry, opts: { showActions: "active" | "pending" | "archived" }) => (
    <Card key={entry.id} className="border-violet-dim bg-deep-space">
      <CardHeader className="p-3 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`h-5 px-2 text-[10px] ${kindBadgeColor(entry.kind)}`}>
              {entry.kind}
            </Badge>
            {entry.pinned && (
              <Badge className="h-5 bg-amber-500/20 px-2 text-[10px] text-amber-400">
                📌 pinned
              </Badge>
            )}
            {entry.confidence !== null && (
              <Badge
                className={`h-5 px-2 text-[10px] ${
                  entry.confidence >= 85
                    ? "bg-emerald-500/20 text-emerald-400"
                    : entry.confidence >= 60
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-red-500/20 text-red-400"
                }`}
              >
                conf {entry.confidence}
              </Badge>
            )}
            <span className="text-[10px] text-text-secondary">
              #{entry.id} · {entry.accessCount} reads · {formatTime(entry.updatedAt)}
            </span>
            {entry.sourceType && (
              <Badge
                variant="outline"
                className="h-5 border-violet-dim px-2 text-[10px] text-text-secondary"
              >
                {entry.sourceType}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {opts.showActions === "pending" && (
              <>
                <Button
                  size="xs"
                  onClick={() => approveEntry(entry.id)}
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  ✅ aprovar
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => rejectEntry(entry.id)}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  ❌ rejeitar
                </Button>
              </>
            )}
            {opts.showActions === "active" && (
              <>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => togglePin(entry)}
                  className="border-violet-dim text-text-secondary"
                >
                  {entry.pinned ? "desafixar" : "fixar"}
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => startEdit(entry)}
                  className="border-violet-dim text-violet"
                >
                  ✏️
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => archiveEntry(entry.id)}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  🗄️
                </Button>
              </>
            )}
            {opts.showActions === "archived" && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => restoreEntry(entry.id)}
                className="border-violet-dim text-violet"
              >
                ↩️ restore
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {editingId === entry.id ? (
          <div className="space-y-2">
            <select
              value={editKind}
              onChange={(e) => setEditKind(e.target.value)}
              className="rounded-md border border-violet-dim bg-night-panel px-3 py-1.5 text-xs text-text-body"
            >
              {KINDS.filter((k) => k !== "all").map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[120px] rounded-md border-violet-dim bg-night-panel font-mono text-xs text-text-body"
            />
            <div className="flex gap-1.5">
              <Button
                size="xs"
                onClick={saveEdit}
                className="bg-violet text-white"
              >
                salvar
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={cancelEdit}
                className="border-violet-dim text-text-secondary"
              >
                cancelar
              </Button>
            </div>
          </div>
        ) : (
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-text-body">
            {entry.content}
          </pre>
        )}
      </CardContent>
    </Card>
  );

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">sistema de memória</h2>
            <p className="mt-1 text-sm text-text-secondary">
              forgeclaw v1.5 — entries, review queue, audit trail, fts5 retrieval
            </p>
          </div>
          <Button
            size="xs"
            variant="outline"
            onClick={refreshAll}
            disabled={loading}
            className="border-violet-dim text-violet hover:bg-violet/10"
          >
            {loading ? "carregando..." : "atualizar"}
          </Button>
        </div>

        {/* Review mode settings */}
        <Card className="border-violet-dim bg-deep-space">
          <CardContent className="p-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-medium text-text-primary">modo de atualização automática</p>
                <p className="text-[10px] text-text-secondary mt-0.5">
                  como o janitor diário trata entries extraídos das suas conversas
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="xs"
                  variant={reviewMode === "auto" ? "default" : "outline"}
                  onClick={() => saveReviewMode("auto")}
                  className={
                    reviewMode === "auto"
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "border-violet-dim text-text-secondary"
                  }
                >
                  auto-aprovar tudo
                </Button>
                <Button
                  size="xs"
                  variant={reviewMode === "hybrid" ? "default" : "outline"}
                  onClick={() => saveReviewMode("hybrid")}
                  className={
                    reviewMode === "hybrid"
                      ? "bg-violet text-white hover:bg-violet/90"
                      : "border-violet-dim text-text-secondary"
                  }
                >
                  híbrido (≥{approveThreshold})
                </Button>
                <Button
                  size="xs"
                  variant={reviewMode === "review" ? "default" : "outline"}
                  onClick={() => saveReviewMode("review")}
                  className={
                    reviewMode === "review"
                      ? "bg-amber-600 text-white hover:bg-amber-500"
                      : "border-violet-dim text-text-secondary"
                  }
                >
                  revisar tudo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-violet-dim">
          {(["active", "pending", "archived", "retrievals", "audit"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-2 text-sm transition-colors ${
                activeTab === t
                  ? "border-b-2 border-violet text-violet"
                  : "text-text-secondary hover:text-text-body"
              }`}
            >
              {tabLabels[t]}
              {t === "active" && entries.length > 0 && ` (${entries.length})`}
              {t === "pending" && pendingEntries.length > 0 && (
                <span className="ml-1 bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-sm text-[10px]">
                  {pendingEntries.length}
                </span>
              )}
              {t === "archived" && archivedEntries.length > 0 && ` (${archivedEntries.length})`}
              {t === "retrievals" && retrievals.length > 0 && ` (${retrievals.length})`}
              {t === "audit" && audit.length > 0 && ` (${audit.length})`}
            </button>
          ))}
        </div>

        {/* ACTIVE */}
        {activeTab === "active" && (
          <div className="space-y-3">
            <Input
              type="search"
              placeholder="buscar memories (FTS5)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar memory entries"
              className="border-violet-dim bg-night-panel text-text-body placeholder:text-text-secondary/60"
            />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1.5 flex-wrap">
                {KINDS.map((k) => (
                  <Button
                    key={k}
                    size="xs"
                    variant={kindFilter === k ? "default" : "outline"}
                    onClick={() => setKindFilter(k)}
                    className={
                      kindFilter === k
                        ? "bg-violet text-white hover:bg-violet/90"
                        : "border-violet-dim text-text-secondary hover:bg-night-panel"
                    }
                  >
                    {k}
                  </Button>
                ))}
              </div>
              <Button
                size="xs"
                onClick={() => setCreating(!creating)}
                className="bg-violet text-white"
              >
                {creating ? "cancelar" : "+ novo entry"}
              </Button>
            </div>

            {creating && (
              <Card className="border-violet bg-deep-space">
                <CardContent className="p-4 space-y-2">
                  <select
                    value={newKind}
                    onChange={(e) => setNewKind(e.target.value)}
                    className="rounded-md border border-violet-dim bg-night-panel px-3 py-1.5 text-xs text-text-body"
                  >
                    {KINDS.filter((k) => k !== "all").map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  <Textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="conteúdo do entry — self-contained, lowercase, 1-3 linhas"
                    className="min-h-[100px] rounded-md border-violet-dim bg-night-panel font-mono text-xs text-text-body"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <input
                        type="checkbox"
                        checked={newPinned}
                        onChange={(e) => setNewPinned(e.target.checked)}
                      />
                      pinned (imortal)
                    </label>
                    <Button
                      size="xs"
                      onClick={createEntry}
                      className="bg-violet text-white ml-auto"
                    >
                      criar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-secondary">
                {debouncedQuery
                  ? `nenhum resultado para "${debouncedQuery}"`
                  : `nenhum entry ${kindFilter !== "all" ? `de kind=${kindFilter}` : ""}`}
              </p>
            ) : (
              entries.map((e) => renderEntryCard(e, { showActions: "active" }))
            )}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="border-violet-dim text-violet hover:bg-violet/10"
                >
                  {loadingMore ? "carregando..." : `carregar mais (exibindo ${entries.length})`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* PENDING REVIEW */}
        {activeTab === "pending" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-text-secondary">
                entries propostos pelo janitor aguardando tua aprovação.{" "}
                <span className="text-amber-400">auto-expira em 7 dias.</span>
              </p>
              {pendingEntries.length > 0 && (
                <div className="flex gap-1.5">
                  <Button
                    size="xs"
                    onClick={approveAllPending}
                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    ✅ aprovar todas
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={rejectAllPending}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    ❌ rejeitar todas
                  </Button>
                </div>
              )}
            </div>
            {pendingEntries.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-secondary">
                nenhum entry aguardando revisão
              </p>
            ) : (
              pendingEntries.map((e) => renderEntryCard(e, { showActions: "pending" }))
            )}
          </div>
        )}

        {/* ARCHIVED */}
        {activeTab === "archived" && (
          <div className="space-y-3">
            <p className="text-xs text-text-secondary">
              entries arquivados (soft delete). podem ser restaurados.
            </p>
            {archivedEntries.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-secondary">
                nenhum entry arquivado
              </p>
            ) : (
              archivedEntries.map((e) => renderEntryCard(e, { showActions: "archived" }))
            )}
          </div>
        )}

        {/* RETRIEVALS */}
        {activeTab === "retrievals" && (
          <div className="space-y-2">
            <p className="text-xs text-text-secondary">
              últimas {retrievals.length} queries ao sistema de memória.{" "}
              <span className="text-emerald-400">●</span> = injetadas;{" "}
              <span className="text-text-secondary/60">○</span> = sem hits relevantes.
            </p>
            {retrievals.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-secondary">
                nenhuma query ainda
              </p>
            ) : (
              retrievals.map((r) => (
                <Card key={r.id} className="border-violet-dim bg-deep-space">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={r.injected ? "text-emerald-400" : "text-text-secondary/60"}>
                        {r.injected ? "●" : "○"}
                      </span>
                      <Badge
                        variant="outline"
                        className="h-4 border-violet-dim px-1.5 text-[9px] text-text-secondary"
                      >
                        {r.source}
                      </Badge>
                      <span className="text-[10px] text-text-secondary">{formatTime(r.at)}</span>
                      <span className="text-[10px] text-text-secondary">{r.hits.length} hit(s)</span>
                    </div>
                    <p className="mt-2 font-mono text-xs text-text-primary">{r.query}</p>
                    {r.hits.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {r.hits.slice(0, 5).map((h, i) => (
                          <div key={i} className="flex gap-2 text-[10px] text-text-secondary">
                            <span className="text-violet">#{h.memoryId}</span>
                            <span>score {h.score.toFixed(2)}</span>
                            <span>{h.reason}</span>
                            <span className="truncate text-text-body">{h.contentPreview}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* AUDIT */}
        {activeTab === "audit" && (
          <div className="space-y-2">
            <p className="text-xs text-text-secondary">
              trilha de auditoria — toda mutação em memory_entries registrada.
            </p>
            {audit.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-secondary">
                sem mudanças ainda
              </p>
            ) : (
              audit.map((a) => (
                <Card key={a.id} className="border-violet-dim bg-deep-space">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge className="h-5 bg-violet/20 px-2 text-[10px] text-violet">
                        {a.action}
                      </Badge>
                      <span className="text-[10px] text-text-secondary">
                        #{a.memoryId} · {a.actor} · {formatTime(a.at)}
                      </span>
                    </div>
                    {a.reason && (
                      <p className="mt-1 text-[10px] text-text-secondary">reason: {a.reason}</p>
                    )}
                    {a.newContent && (
                      <pre className="mt-2 max-h-32 overflow-auto rounded bg-night-panel p-2 font-mono text-[10px] text-text-body">
                        {a.newContent.slice(0, 500)}
                      </pre>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
