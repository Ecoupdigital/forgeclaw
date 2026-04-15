import { cookies } from "next/headers";
import { getDashboardToken } from "./core";

/** Name of the cookie that stores the dashboard auth token. */
export const AUTH_COOKIE_NAME = "fc-token";

/** Max age of the auth cookie in seconds (30 days). */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Validate a token string against the configured dashboardToken.
 * Returns true if tokens match, false otherwise.
 * If no dashboardToken is configured, returns true (auth disabled / dev mode).
 */
export async function validateToken(token: string | null | undefined): Promise<boolean> {
  const expected = await getDashboardToken();
  // If no token configured, auth is disabled (backward compat)
  if (!expected) return true;
  if (!token) return false;
  // Constant-time comparison to prevent timing attacks
  if (token.length !== expected.length) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(token);
  const b = encoder.encode(expected);
  return timingSafeEqual(a, b);
}

/**
 * Constant-time buffer comparison.
 * Uses XOR accumulation -- not crypto.timingSafeEqual because that
 * requires Node.js crypto which may not be available in all Next.js
 * runtimes. This is equivalent for our use case.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Check auth from an API route Request.
 * Checks Authorization header first (Bearer <token>), then fc-token cookie.
 * Returns { ok: true } if authenticated, { ok: false, response: Response } otherwise.
 */
export async function requireApiAuth(
  request: Request
): Promise<{ ok: true } | { ok: false; response: Response }> {
  // Check if auth is configured at all
  const expected = await getDashboardToken();
  if (!expected) return { ok: true }; // No token = auth disabled

  // 1. Try Authorization header
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      const valid = await validateToken(parts[1]);
      if (valid) return { ok: true };
    }
    return {
      ok: false,
      response: Response.json({ error: "Invalid token" }, { status: 401 }),
    };
  }

  // 2. Try cookie (for requests from the dashboard UI)
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (tokenCookie) {
      const valid = await validateToken(tokenCookie.value);
      if (valid) return { ok: true };
    }
  } catch {
    // cookies() may fail outside request context
  }

  return {
    ok: false,
    response: Response.json({ error: "Authentication required" }, { status: 401 }),
  };
}
