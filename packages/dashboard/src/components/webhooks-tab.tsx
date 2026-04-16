"use client";

import { useState, useEffect, useCallback } from "react";
import type { Webhook, WebhookDeliveryLog, ActivityType } from "@/lib/types";

const ALL_EVENT_TYPES: ActivityType[] = [
  "session:created",
  "session:resumed",
  "message:sent",
  "message:received",
  "cron:fired",
  "cron:completed",
  "cron:failed",
  "memory:created",
  "memory:updated",
  "webhook:delivered",
  "webhook:failed",
];

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<number | null>(null);
  const [deliveryLogs, setDeliveryLogs] = useState<WebhookDeliveryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/webhooks");
      const data = await res.json();
      setWebhooks(data.webhooks ?? []);
    } catch (err) {
      console.error("[webhooks-tab] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  async function handleCreate() {
    setFormError(null);
    if (!formUrl.trim()) {
      setFormError("URL e obrigatoria");
      return;
    }
    if (formEvents.length === 0) {
      setFormError("Selecione pelo menos um evento");
      return;
    }
    setFormSaving(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formUrl, events: formEvents }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? "Falha ao criar webhook");
        return;
      }
      setFormUrl("");
      setFormEvents([]);
      setShowForm(false);
      await fetchWebhooks();
    } catch {
      setFormError("Erro de rede");
    } finally {
      setFormSaving(false);
    }
  }

  async function handleToggle(id: number, enabled: boolean) {
    try {
      await fetch(`/api/webhooks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      await fetchWebhooks();
    } catch (err) {
      console.error("[webhooks-tab] Toggle error:", err);
    }
  }

  async function handleDelete(id: number) {
    try {
      await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      await fetchWebhooks();
    } catch (err) {
      console.error("[webhooks-tab] Delete error:", err);
    }
  }

  async function loadLogs(webhookId: number) {
    if (expandedLogs === webhookId) {
      setExpandedLogs(null);
      return;
    }
    setExpandedLogs(webhookId);
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/webhooks/${webhookId}/logs?limit=20`);
      const data = await res.json();
      setDeliveryLogs(data.logs ?? []);
    } catch {
      setDeliveryLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  function toggleEvent(event: string) {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  function toggleSecret(id: number) {
    setRevealedSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
        Carregando webhooks...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-body">Webhooks</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-violet/20 px-3 py-1.5 text-xs font-medium text-violet hover:bg-violet/30 transition-colors"
        >
          {showForm ? "Cancelar" : "+ Novo Webhook"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-lg border border-violet/20 bg-deep-space/50 p-4 space-y-3">
          <div>
            <label className="block text-[10px] text-text-secondary mb-1">URL do Webhook</label>
            <input
              type="url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="w-full rounded border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-text-body placeholder:text-text-disabled focus:border-violet/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-text-secondary mb-1">Eventos</label>
            <div className="flex flex-wrap gap-1">
              {ALL_EVENT_TYPES.map((event) => (
                <button
                  key={event}
                  onClick={() => toggleEvent(event)}
                  className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                    formEvents.includes(event)
                      ? "bg-violet/20 text-violet"
                      : "bg-white/[0.04] text-text-secondary hover:bg-white/[0.08]"
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>
          {formError && (
            <div className="text-xs text-red-400">{formError}</div>
          )}
          <button
            onClick={handleCreate}
            disabled={formSaving}
            className="rounded bg-violet px-4 py-1.5 text-xs font-medium text-white hover:bg-violet/90 disabled:opacity-50 transition-colors"
          >
            {formSaving ? "Criando..." : "Criar Webhook"}
          </button>
        </div>
      )}

      {/* Webhooks list */}
      {webhooks.length === 0 && !showForm ? (
        <div className="rounded-lg border border-white/[0.06] bg-deep-space/50 p-8 text-center">
          <div className="text-sm text-text-secondary">Nenhum webhook configurado.</div>
          <div className="mt-1 text-[10px] text-text-disabled">
            Webhooks enviam notificacoes HTTP quando eventos ocorrem no ForgeClaw.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className="rounded-lg border border-white/[0.06] bg-deep-space/50"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        wh.enabled ? "bg-emerald-500" : "bg-red-400"
                      }`}
                    />
                    <span className="text-xs font-mono text-text-body truncate">
                      {wh.url}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {wh.events.map((event) => (
                      <span
                        key={event}
                        className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-text-secondary"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                  {/* Secret */}
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-[10px] text-text-disabled">Secret:</span>
                    <span className="text-[10px] font-mono text-text-secondary">
                      {revealedSecrets.has(wh.id)
                        ? wh.secret
                        : wh.secret.slice(0, 8) + "..."}
                    </span>
                    <button
                      onClick={() => toggleSecret(wh.id)}
                      className="text-[10px] text-violet hover:underline"
                    >
                      {revealedSecrets.has(wh.id) ? "ocultar" : "revelar"}
                    </button>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggle(wh.id, wh.enabled)}
                    className="rounded px-2 py-1 text-[10px] text-text-secondary hover:bg-white/[0.04] transition-colors"
                    title={wh.enabled ? "Desativar" : "Ativar"}
                  >
                    {wh.enabled ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => loadLogs(wh.id)}
                    className="rounded px-2 py-1 text-[10px] text-text-secondary hover:bg-white/[0.04] transition-colors"
                  >
                    Logs
                  </button>
                  {deleteConfirm === wh.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(wh.id)}
                        className="rounded bg-red-500/20 px-2 py-1 text-[10px] text-red-400"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded px-2 py-1 text-[10px] text-text-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(wh.id)}
                      className="rounded px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Deletar
                    </button>
                  )}
                </div>
              </div>

              {/* Delivery logs (expanded) */}
              {expandedLogs === wh.id && (
                <div className="border-t border-white/[0.06] px-4 py-3">
                  <div className="text-[10px] font-medium text-text-secondary mb-2">
                    Historico de Entregas
                  </div>
                  {logsLoading ? (
                    <div className="text-[10px] text-text-disabled">Carregando...</div>
                  ) : deliveryLogs.length === 0 ? (
                    <div className="text-[10px] text-text-disabled">
                      Nenhuma entrega registrada.
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {deliveryLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-2 text-[10px]"
                        >
                          <span
                            className={`font-mono ${
                              log.statusCode && log.statusCode >= 200 && log.statusCode < 300
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {log.statusCode ?? "ERR"}
                          </span>
                          <span className="text-text-secondary">{log.eventType}</span>
                          <span className="text-text-disabled">tentativa {log.attempt}</span>
                          <span className="text-text-disabled ml-auto">
                            {timeAgo(log.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
