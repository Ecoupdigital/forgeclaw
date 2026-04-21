import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isOnboarded } from "@/lib/onboarding-state";

/** Cookie name must match lib/auth.ts AUTH_COOKIE_NAME */
const AUTH_COOKIE = "fc-token";

/**
 * Next.js 16 Proxy. Runs before every matched route.
 *
 * Order of gates:
 *  1. Public paths (login page, auth APIs) → pass through
 *  2. All /api/* routes → pass through (each route validates auth itself via requireApiAuth)
 *  3. Auth cookie check → redirect to /login if missing
 *  4. Onboarding sentinel check → redirect to /onboarding if not onboarded
 *     unless the user is already on /onboarding
 *  5. Reverse case: if onboarded and user on /onboarding → redirect to /
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Gate 1: Public paths ---
  // /refine/bootstrap is the CLI auto-login entry point (see Gate 3 below)
  // so it must be reachable without the fc-token cookie.
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/refine/bootstrap"
  ) {
    return NextResponse.next();
  }

  // --- Gate 2: API routes (self-guard via requireApiAuth) ---
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // --- Gate 3: Auth cookie ---
  const token = request.cookies.get(AUTH_COOKIE);
  if (!token?.value) {
    // CLI-to-dashboard handoff: `forgeclaw refine` opens /refine?token=...
    // so the user lands in the right page without logging in by hand. If a
    // ?token= is present on an unauthenticated request targeting /refine or
    // /onboarding, route through /refine/bootstrap which exchanges the
    // query token for the fc-token cookie and redirects back. Scoped to
    // /refine and /onboarding only — we do not want ?token= to be a valid
    // auth vector across the whole dashboard.
    const queryToken = request.nextUrl.searchParams.get("token");
    const isAllowedBootstrapTarget =
      pathname === "/refine" ||
      pathname.startsWith("/refine/") ||
      pathname === "/onboarding" ||
      pathname.startsWith("/onboarding/");
    if (
      queryToken &&
      isAllowedBootstrapTarget &&
      pathname !== "/refine/bootstrap"
    ) {
      const bootstrap = new URL("/refine/bootstrap", request.url);
      bootstrap.searchParams.set("token", queryToken);
      // Preserve the original URL (path + remaining query) so bootstrap can
      // redirect back after the cookie is set.
      const sanitized = new URL(request.nextUrl.toString());
      sanitized.searchParams.delete("token");
      bootstrap.searchParams.set(
        "next",
        sanitized.pathname + (sanitized.search ? sanitized.search : ""),
      );
      return NextResponse.redirect(bootstrap);
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // --- Gate 4 & 5: Onboarding sentinel ---
  const onboarded = isOnboarded();
  const onOnboardingRoute = pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  if (!onboarded && !onOnboardingRoute) {
    // Force first-run user to onboarding
    const onbUrl = new URL("/onboarding", request.url);
    return NextResponse.redirect(onbUrl);
  }

  if (onboarded && onOnboardingRoute) {
    // Already onboarded → /onboarding should bounce to dashboard home
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

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
