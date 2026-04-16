import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Cookie name must match lib/auth.ts AUTH_COOKIE_NAME */
const AUTH_COOKIE = "fc-token";

/**
 * Next.js 16 Proxy (replaces middleware.ts).
 * Runs before every matched route. Redirects to /login if auth cookie is missing.
 *
 * Auth for API routes is NOT handled here -- each API route uses requireApiAuth()
 * from lib/auth.ts instead, because the proxy cannot do async config reads
 * reliably and API routes need to return JSON 401 (not redirect).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and auth API without cookie
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Allow all API routes (they validate auth themselves via requireApiAuth)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const token = request.cookies.get(AUTH_COOKIE);
  if (!token?.value) {
    // Redirect to login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Cookie exists -- allow through.
  // Token validity is verified at the API layer. The proxy only checks
  // presence to avoid expensive async config reads on every page load.
  // If the token is invalid, API calls will fail with 401 and the UI
  // will redirect to login.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser icon)
     * - public files with extensions (.png, .svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$).*)",
  ],
};
