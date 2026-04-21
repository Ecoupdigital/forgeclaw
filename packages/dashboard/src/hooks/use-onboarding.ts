"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  OnboardingSessionSnapshot,
  OnboardingApiError,
  OnboardingApproveResponse,
  OnboardingSkipResponse,
} from "@/lib/onboarding-types";

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; snapshot: OnboardingSessionSnapshot }
  | { kind: "error"; error: string; code?: OnboardingApiError["code"] };

export interface UseOnboardingResult {
  state: FetchState;
  /** Convenience accessor for snapshot when state.kind === 'ready'. */
  snapshot: OnboardingSessionSnapshot | null;
  /** True while any API call is in flight. */
  inFlight: boolean;
  /** Errors from the most recent call; auto-cleared on next success. */
  error: string | null;
  /** Fetch current state. If 404 NO_SESSION and autoStart=true, calls /start. */
  refresh: () => Promise<void>;
  /** Start a fresh interview. No-op if one is already active. */
  start: () => Promise<void>;
  /** Send a user message. Requires status==='asking'. */
  sendMessage: (text: string) => Promise<void>;
  /** Approve final diff: applies to disk + redirects to /. */
  approve: () => Promise<void>;
  /** Skip interview: creates sentinel with source=skipped + redirects to /. */
  skip: () => Promise<void>;
  /** Pause interview: persists snapshot + aborts in-memory session. */
  pause: () => Promise<void>;
  /** Resume interview: re-creates Interviewer with same archetype. */
  resume: () => Promise<void>;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body as OnboardingApiError;
    const message = err.error ?? `HTTP ${res.status}`;
    const e = new Error(message) as Error & { code?: string; status?: number };
    e.code = err.code;
    e.status = res.status;
    throw e;
  }
  return body as T;
}

export function useOnboarding(options: { autoStart?: boolean } = {}): UseOnboardingResult {
  const { autoStart = true } = options;
  const [state, setState] = useState<FetchState>({ kind: "idle" });
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setReady = useCallback((snapshot: OnboardingSessionSnapshot) => {
    if (!mountedRef.current) return;
    setState({ kind: "ready", snapshot });
    setError(null);
  }, []);

  const handleError = useCallback((err: unknown, defaultMsg: string) => {
    if (!mountedRef.current) return;
    const message = err instanceof Error ? err.message : defaultMsg;
    const code = (err as { code?: OnboardingApiError["code"] }).code;
    setError(message);
    setState({ kind: "error", error: message, code });
  }, []);

  const start = useCallback(async () => {
    setInFlight(true);
    setError(null);
    try {
      const snapshot = await fetchJson<OnboardingSessionSnapshot>(
        "/api/onboarding/start",
        { method: "POST", body: JSON.stringify({}) },
      );
      setReady(snapshot);
    } catch (err) {
      const status = (err as { status?: number }).status;
      const code = (err as { code?: string }).code;
      if (status === 409 && code === "ALREADY_DONE") {
        // Already onboarded — backend redirects UI via proxy, but just in case
        // we reflect that: push to root.
        if (typeof window !== "undefined") window.location.href = "/";
        return;
      }
      handleError(err, "Failed to start onboarding");
    } finally {
      if (mountedRef.current) setInFlight(false);
    }
  }, [setReady, handleError]);

  const refresh = useCallback(async () => {
    setInFlight(true);
    setError(null);
    try {
      const snapshot = await fetchJson<OnboardingSessionSnapshot>(
        "/api/onboarding/state",
        { method: "GET" },
      );
      setReady(snapshot);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "NO_SESSION" && autoStart) {
        await start();
        return;
      }
      handleError(err, "Failed to load onboarding state");
    } finally {
      if (mountedRef.current) setInFlight(false);
    }
  }, [autoStart, start, setReady, handleError]);

  const sendMessage = useCallback(async (text: string) => {
    setInFlight(true);
    setError(null);
    // Optimistic append of user turn — backend will rewrite on response
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
      const snapshot = await fetchJson<OnboardingSessionSnapshot>(
        "/api/onboarding/message",
        { method: "POST", body: JSON.stringify({ text }) },
      );
      setReady(snapshot);
    } catch (err) {
      handleError(err, "Failed to send message");
    } finally {
      if (mountedRef.current) setInFlight(false);
    }
  }, [setReady, handleError]);

  const approve = useCallback(async () => {
    setInFlight(true);
    setError(null);
    try {
      const resp = await fetchJson<OnboardingApproveResponse>(
        "/api/onboarding/approve",
        { method: "POST", body: JSON.stringify({}) },
      );
      if (typeof window !== "undefined") {
        window.location.href = resp.redirectTo ?? "/";
      }
    } catch (err) {
      handleError(err, "Failed to approve");
    } finally {
      if (mountedRef.current) setInFlight(false);
    }
  }, [handleError]);

  const skip = useCallback(async () => {
    setInFlight(true);
    setError(null);
    try {
      const resp = await fetchJson<OnboardingSkipResponse>(
        "/api/onboarding/skip",
        { method: "POST", body: JSON.stringify({}) },
      );
      if (typeof window !== "undefined") {
        window.location.href = resp.redirectTo ?? "/";
      }
    } catch (err) {
      handleError(err, "Failed to skip");
    } finally {
      if (mountedRef.current) setInFlight(false);
    }
  }, [handleError]);

  const pause = useCallback(async () => {
    setInFlight(true);
    setError(null);
    try {
      await fetchJson<{ ok: boolean }>("/api/onboarding/pause", {
        method: "POST",
        body: JSON.stringify({}),
      });
      // After pause the store is destroyed; refresh to get persisted snapshot
      await refresh();
    } catch (err) {
      handleError(err, "Failed to pause");
    } finally {
      if (mountedRef.current) setInFlight(false);
    }
  }, [refresh, handleError]);

  const resume = useCallback(async () => {
    setInFlight(true);
    setError(null);
    try {
      const snapshot = await fetchJson<OnboardingSessionSnapshot>(
        "/api/onboarding/resume",
        { method: "POST", body: JSON.stringify({}) },
      );
      setReady(snapshot);
    } catch (err) {
      handleError(err, "Failed to resume");
    } finally {
      if (mountedRef.current) setInFlight(false);
    }
  }, [setReady, handleError]);

  // Bootstrap on mount
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll /state while status === 'thinking' (detects crash or slow completion).
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
    refresh,
    start,
    sendMessage,
    approve,
    skip,
    pause,
    resume,
  };
}
