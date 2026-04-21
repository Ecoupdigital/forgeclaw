"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  RefineSessionSnapshot,
  RefineApiError,
  RefineApplyResponse,
  RefineCancelResponse,
  RefineArchetype,
  RefineMode,
  RefineSection,
} from "@/lib/refine-types";

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; snapshot: RefineSessionSnapshot }
  | { kind: "error"; error: string; code?: RefineApiError["code"] };

export interface UseRefineOptions {
  mode: RefineMode;
  archetype?: RefineArchetype;
  section?: RefineSection;
}

export interface UseRefineResult {
  state: FetchState;
  snapshot: RefineSessionSnapshot | null;
  inFlight: boolean;
  error: string | null;
  start: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  approve: () => Promise<void>;
  cancel: () => Promise<void>;
  refresh: () => Promise<void>;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body as RefineApiError;
    const message = err.error ?? `HTTP ${res.status}`;
    const e = new Error(message) as Error & { code?: string; status?: number };
    e.code = err.code;
    e.status = res.status;
    throw e;
  }
  return body as T;
}

/**
 * Drives the /refine page. Unlike useOnboarding:
 *  - sessionId is tracked locally (refine allows multiple concurrent sessions)
 *  - start() must be called explicitly (we don't auto-start because the mode/
 *    archetype/section come from URL params parsed by the page)
 *  - approve() redirects to /refine/done instead of /
 *  - cancel() hits /session/cancel and redirects to /refine/cancelled
 *
 * Polling while status === 'thinking' mirrors onboarding — detects slow
 * turns without manual refresh.
 */
export function useRefine(options: UseRefineOptions): UseRefineResult {
  const [state, setState] = useState<FetchState>({ kind: "idle" });
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setReady = useCallback((snapshot: RefineSessionSnapshot) => {
    if (!mountedRef.current) return;
    sessionIdRef.current = snapshot.sessionId;
    setState({ kind: "ready", snapshot });
    setError(null);
  }, []);

  const handleError = useCallback((err: unknown, defaultMsg: string) => {
    if (!mountedRef.current) return;
    const message = err instanceof Error ? err.message : defaultMsg;
    const code = (err as { code?: RefineApiError["code"] }).code;
    setError(message);
    setState((prev) =>
      prev.kind === "ready"
        ? { kind: "ready", snapshot: prev.snapshot }
        : { kind: "error", error: message, code },
    );
  }, []);

  const start = useCallback(async () => {
    setInFlight(true);
    setError(null);
    setState({ kind: "loading" });
    try {
      const snapshot = await fetchJson<RefineSessionSnapshot>(
        "/api/refine/session",
        {
          method: "POST",
          body: JSON.stringify({
            mode: options.mode,
            archetype: options.archetype,
            section: options.section,
          }),
        },
      );
      setReady(snapshot);
    } catch (err) {
      handleError(err, "Failed to start refine session");
    } finally {
      if (mountedRef.current) setInFlight(false);
    }
  }, [options.mode, options.archetype, options.section, setReady, handleError]);

  const refresh = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    setInFlight(true);
    try {
      const snapshot = await fetchJson<RefineSessionSnapshot>(
        `/api/refine/session?sessionId=${encodeURIComponent(sessionId)}`,
      );
      setReady(snapshot);
    } catch (err) {
      handleError(err, "Failed to refresh refine session");
    } finally {
      if (mountedRef.current) setInFlight(false);
    }
  }, [setReady, handleError]);

  const sendMessage = useCallback(
    async (text: string) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      setInFlight(true);
      setError(null);
      // Optimistic: append user turn + mark thinking
      setState((prev) => {
        if (prev.kind !== "ready") return prev;
        const snap = prev.snapshot;
        const nextIndex = snap.messages.length + 1;
        return {
          kind: "ready",
          snapshot: {
            ...snap,
            status: "thinking",
            messages: [
              ...snap.messages,
              { index: nextIndex, role: "user", text, at: Date.now() },
            ],
            currentQuestion: null,
            currentRationale: null,
          },
        };
      });
      try {
        const snapshot = await fetchJson<RefineSessionSnapshot>(
          "/api/refine/message",
          {
            method: "POST",
            body: JSON.stringify({ sessionId, text }),
          },
        );
        setReady(snapshot);
      } catch (err) {
        handleError(err, "Failed to send message");
      } finally {
        if (mountedRef.current) setInFlight(false);
      }
    },
    [setReady, handleError],
  );

  const approve = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    setInFlight(true);
    setError(null);
    try {
      const resp = await fetchJson<RefineApplyResponse>("/api/refine/apply", {
        method: "POST",
        body: JSON.stringify({ sessionId, reason: "dashboard-approved" }),
      });
      if (typeof window !== "undefined") {
        const qs = new URLSearchParams({ backupId: resp.backupId }).toString();
        window.location.href = `/refine/done?${qs}`;
      }
    } catch (err) {
      handleError(err, "Failed to apply refine");
    } finally {
      if (mountedRef.current) setInFlight(false);
    }
  }, [handleError]);

  const cancel = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      // No session -> just go to cancelled page.
      if (typeof window !== "undefined") window.location.href = "/refine/cancelled";
      return;
    }
    setInFlight(true);
    setError(null);
    try {
      await fetchJson<RefineCancelResponse>(
        "/api/refine/session/cancel",
        {
          method: "POST",
          body: JSON.stringify({ sessionId }),
        },
      );
      if (typeof window !== "undefined") window.location.href = "/refine/cancelled";
    } catch (err) {
      handleError(err, "Failed to cancel refine");
    } finally {
      if (mountedRef.current) setInFlight(false);
    }
  }, [handleError]);

  // Poll /session while status === 'thinking' to detect slow completions.
  useEffect(() => {
    if (state.kind !== "ready") return;
    if (state.snapshot.status !== "thinking") return;
    const interval = setInterval(() => {
      void refresh();
    }, 8000);
    return () => clearInterval(interval);
  }, [state, refresh]);

  return {
    state,
    snapshot: state.kind === "ready" ? state.snapshot : null,
    inFlight,
    error,
    start,
    sendMessage,
    approve,
    cancel,
    refresh,
  };
}
