"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, X, Bot, Tag, Cpu, Brain } from "lucide-react";
import type { AgentConfig, MemoryMode } from "@/lib/types";

// --- Toast inline ---
function useToast() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const show = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  return { toast, show };
}

// --- Tag chips input ---
function TagChips({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const tag = input.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput("");
  };

  return (
    <div className="flex flex-wrap gap-1.5 rounded-md border border-white/[0.06] bg-night-panel/60 p-2 min-h-[38px]">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-violet/20 px-2.5 py-0.5 text-xs text-violet"
        >
          <Tag className="h-3 w-3" />
          {tag}
          <button
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="ml-0.5 hover:text-red-400 transition-colors"
            aria-label={`Remover tag ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); addTag(); }
        }}
        placeholder={tags.length === 0 ? (placeholder ?? "Digite uma tag e pressione Enter") : ""}
        className="flex-1 min-w-[120px] bg-transparent text-xs text-text-body outline-none placeholder:text-text-disabled"
      />
    </div>
  );
}

// --- Agent form ---
interface AgentFormData {
  name: string;
  systemPrompt: string;
  memoryMode: MemoryMode;
  memoryDomainFilter: string[];
  defaultRuntime: "claude-code" | "codex" | null;
}

function AgentForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: AgentFormData;
  onSubmit: (data: AgentFormData) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<AgentFormData>(
    initial ?? {
      name: "",
      systemPrompt: "",
      memoryMode: "global",
      memoryDomainFilter: [],
      defaultRuntime: null,
    }
  );

  return (
    <div className="space-y-3 rounded-lg border border-white/[0.06] bg-night-panel/40 p-4">
      {/* Nome */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Nome</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ex: Financeiro, Suporte, Dev..."
          className="h-8 bg-night-panel/60 border-white/[0.06] text-xs"
        />
      </div>

      {/* System Prompt */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Prompt do sistema</label>
        <textarea
          value={form.systemPrompt}
          onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
          placeholder="Instrucoes de persona/comportamento para este agente..."
          rows={6}
          className="w-full rounded-md border border-white/[0.06] bg-night-panel/60 px-3 py-2 text-xs text-text-body placeholder:text-text-disabled focus:border-violet/40 focus:outline-none focus:ring-1 focus:ring-violet/20 resize-y"
        />
      </div>

      {/* Memory Mode + Runtime */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Modo de memoria</label>
          <select
            value={form.memoryMode}
            onChange={(e) => setForm({ ...form, memoryMode: e.target.value as MemoryMode })}
            className="h-8 w-full rounded-md border border-white/[0.06] bg-night-panel/60 px-2 text-xs text-text-body"
          >
            <option value="global">Global (todas as memorias)</option>
            <option value="filtered">Filtrado (por tags)</option>
            <option value="none">Nenhuma (sem memoria)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Runtime padrao</label>
          <select
            value={form.defaultRuntime ?? ""}
            onChange={(e) => setForm({ ...form, defaultRuntime: e.target.value === "" ? null : e.target.value as "claude-code" | "codex" })}
            className="h-8 w-full rounded-md border border-white/[0.06] bg-night-panel/60 px-2 text-xs text-text-body"
          >
            <option value="">Padrao do sistema</option>
            <option value="claude-code">Claude Code</option>
            <option value="codex">Codex</option>
          </select>
        </div>
      </div>

      {/* Tags (only when filtered) */}
      {form.memoryMode === "filtered" && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Tags de filtro</label>
          <TagChips
            tags={form.memoryDomainFilter}
            onChange={(tags) => setForm({ ...form, memoryDomainFilter: tags })}
            placeholder="Ex: financeiro, clientes, projetos..."
          />
          <p className="mt-1 text-[10px] text-text-disabled">
            Apenas memorias com essas tags serao injetadas no contexto deste agente.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={() => onSubmit(form)}
          disabled={submitting || !form.name.trim()}
          size="sm"
          className="bg-violet hover:bg-violet/80 text-white text-xs h-7"
        >
          {submitting ? "Salvando..." : initial ? "Atualizar" : "Criar agente"}
        </Button>
        <Button onClick={onCancel} variant="ghost" size="sm" className="text-xs h-7">
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// --- Agent card ---
function AgentCard({
  agent,
  topicCount,
  onEdit,
  onDelete,
}: {
  agent: AgentConfig;
  topicCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="rounded-lg border border-white/[0.06] bg-night-panel/40 p-4 transition-colors hover:border-white/[0.1]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-violet" />
          <span className="text-sm font-medium text-text-body">{agent.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1 rounded text-text-disabled hover:text-text-body hover:bg-white/[0.04] transition-colors"
            aria-label="Editar agente"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onDelete}
                className="px-2 py-0.5 text-[10px] rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-0.5 text-[10px] rounded bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 rounded text-text-disabled hover:text-red-400 hover:bg-white/[0.04] transition-colors"
              aria-label="Deletar agente"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono ${
          agent.memoryMode === "none"
            ? "bg-red-500/15 text-red-400"
            : agent.memoryMode === "filtered"
              ? "bg-amber-500/15 text-amber-400"
              : "bg-emerald-500/15 text-emerald-400"
        }`}>
          <Brain className="h-3 w-3" />
          {agent.memoryMode === "none" ? "Sem memoria" : agent.memoryMode === "filtered" ? "Filtrado" : "Global"}
        </span>
        {agent.defaultRuntime && (
          <span className="inline-flex items-center gap-1 rounded-full bg-code-blue/15 px-2 py-0.5 text-[10px] font-mono text-code-blue">
            <Cpu className="h-3 w-3" />
            {agent.defaultRuntime}
          </span>
        )}
        <span className="text-[10px] text-text-disabled">
          {topicCount} topic{topicCount !== 1 ? "s" : ""} vinculado{topicCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tags */}
      {agent.memoryDomainFilter.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {agent.memoryDomainFilter.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-violet/10 px-2 py-0.5 text-[10px] text-violet">
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Prompt preview */}
      {agent.systemPrompt && (
        <p className="mt-2 line-clamp-2 text-xs text-text-secondary leading-relaxed">
          {agent.systemPrompt}
        </p>
      )}
    </div>
  );
}

// --- Main tab ---
export function AgentsTab() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [topicCounts, setTopicCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast, show: showToast } = useToast();

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      if (data.agents) {
        setAgents(data.agents);
        // Fetch topic counts for each agent
        const counts: Record<number, number> = {};
        await Promise.all(
          data.agents.map(async (agent: AgentConfig) => {
            try {
              const r = await fetch(`/api/agents/${agent.id}`);
              const d = await r.json();
              counts[agent.id] = d.topics?.length ?? 0;
            } catch {
              counts[agent.id] = 0;
            }
          })
        );
        setTopicCounts(counts);
      }
    } catch (err) {
      console.error("Failed to fetch agents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleCreate = async (data: AgentFormData) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          systemPrompt: data.systemPrompt || null,
          memoryMode: data.memoryMode,
          memoryDomainFilter: data.memoryDomainFilter,
          defaultRuntime: data.defaultRuntime,
        }),
      });
      if (res.ok) {
        showToast("Agente criado com sucesso");
        setShowCreate(false);
        fetchAgents();
      } else {
        const err = await res.json();
        showToast(err.error ?? "Erro ao criar agente", "error");
      }
    } catch {
      showToast("Erro de rede", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: number, data: AgentFormData) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          systemPrompt: data.systemPrompt || null,
          memoryMode: data.memoryMode,
          memoryDomainFilter: data.memoryDomainFilter,
          defaultRuntime: data.defaultRuntime,
        }),
      });
      if (res.ok) {
        showToast("Agente atualizado");
        setEditingId(null);
        fetchAgents();
      } else {
        const err = await res.json();
        showToast(err.error ?? "Erro ao atualizar", "error");
      }
    } catch {
      showToast("Erro de rede", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Agente deletado");
        fetchAgents();
      } else {
        showToast("Erro ao deletar", "error");
      }
    } catch {
      showToast("Erro de rede", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary">Carregando agentes...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-xs font-medium shadow-lg transition-all ${
            toast.type === "error"
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-body">Agentes</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure agentes especializados com prompts e filtros de memoria proprios.
          </p>
        </div>
        {!showCreate && (
          <Button
            onClick={() => { setShowCreate(true); setEditingId(null); }}
            size="sm"
            className="bg-violet hover:bg-violet/80 text-white text-xs h-7 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Agente
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6">
          <AgentForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            submitting={submitting}
          />
        </div>
      )}

      {/* Agent list */}
      {agents.length === 0 && !showCreate ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bot className="h-8 w-8 text-text-disabled mb-3" />
          <p className="text-sm text-text-secondary">Nenhum agente criado</p>
          <p className="text-xs text-text-disabled mt-1">
            Crie um agente para dar personalidade e filtro de memoria a um topic.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) =>
            editingId === agent.id ? (
              <div key={agent.id} className="sm:col-span-2 lg:col-span-3">
                <AgentForm
                  initial={{
                    name: agent.name,
                    systemPrompt: agent.systemPrompt ?? "",
                    memoryMode: agent.memoryMode,
                    memoryDomainFilter: agent.memoryDomainFilter,
                    defaultRuntime: agent.defaultRuntime,
                  }}
                  onSubmit={(data) => handleUpdate(agent.id, data)}
                  onCancel={() => setEditingId(null)}
                  submitting={submitting}
                />
              </div>
            ) : (
              <AgentCard
                key={agent.id}
                agent={agent}
                topicCount={topicCounts[agent.id] ?? 0}
                onEdit={() => { setEditingId(agent.id); setShowCreate(false); }}
                onDelete={() => handleDelete(agent.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
