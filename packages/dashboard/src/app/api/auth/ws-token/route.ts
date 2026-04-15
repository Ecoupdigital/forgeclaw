import { cookies } from "next/headers";
import { validateToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { getDashboardToken } from "@/lib/core";

/**
 * Returns the dashboard token for WebSocket authentication.
 * Only accessible to already-authenticated users (cookie validated).
 * The WS client needs this because httpOnly cookies are not accessible
 * via document.cookie, and WebSocket upgrade does not send cookies.
 */
export async function GET() {
  const expected = await getDashboardToken();
  if (!expected) {
    // Auth disabled -- no token needed for WS
    return Response.json({ token: null });
  }

  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (!tokenCookie?.value) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const valid = await validateToken(tokenCookie.value);
    if (!valid) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    // Return the raw token so the client can pass it as WS query param
    return Response.json({ token: tokenCookie.value });
  } catch {
    return Response.json({ error: "Auth check failed" }, { status: 500 });
  }
}
