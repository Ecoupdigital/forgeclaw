import { validateToken, AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from "@/lib/auth";
import { getDashboardToken } from "@/lib/core";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string };
    const token = body?.token;

    if (!token || typeof token !== "string") {
      return Response.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Check if auth is even configured
    const expected = await getDashboardToken();
    if (!expected) {
      return Response.json(
        { error: "Dashboard authentication is not configured. Run 'forgeclaw install' to set up." },
        { status: 500 }
      );
    }

    const valid = await validateToken(token);
    if (!valid) {
      return Response.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Set httpOnly cookie with the token
    const response = Response.json({ ok: true });

    // Build Set-Cookie header manually for maximum control
    const cookieParts = [
      `${AUTH_COOKIE_NAME}=${token}`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=${AUTH_COOKIE_MAX_AGE}`,
    ];

    // Only add Secure flag in production (not localhost dev)
    if (process.env.NODE_ENV === "production") {
      cookieParts.push("Secure");
    }

    response.headers.set("Set-Cookie", cookieParts.join("; "));
    return response;
  } catch {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
