"use client";

import { useState, useEffect, useMemo } from "react";

const DEFAULT_TZ = "America/Sao_Paulo";

/**
 * Format a Unix-ms timestamp in the given IANA timezone.
 * Uses Intl.DateTimeFormat for DST-correct display.
 */
export function formatInTz(ms: number, tz: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(ms));
  } catch {
    // Fallback if tz is invalid
    return new Date(ms).toISOString().replace("T", " ").slice(0, 16);
  }
}

/**
 * Hook that fetches the configured timezone from /api/config.
 * Returns { timezone, formatTime } where formatTime(ms) produces
 * a locale string in the configured timezone.
 *
 * Fetches once on mount, caches in module-level variable.
 */
let cachedTz: string | null = null;

export function useTimezone(): {
  timezone: string;
  formatTime: (ms: number) => string;
} {
  const [tz, setTz] = useState<string>(cachedTz ?? DEFAULT_TZ);

  useEffect(() => {
    if (cachedTz) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/config", { cache: "no-store" });
        const data = await res.json();
        const configTz = data.config?.timezone;
        if (!cancelled && typeof configTz === "string" && configTz) {
          cachedTz = configTz;
          setTz(configTz);
        }
      } catch {
        // Keep default
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const formatTime = useMemo(
    () => (ms: number) => formatInTz(ms, tz),
    [tz],
  );

  return { timezone: tz, formatTime };
}
