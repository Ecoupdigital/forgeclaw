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
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // --- Gate 2: API routes (self-guard via requireApiAuth) ---
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // --- Gate 3: Auth cookie ---
  const token = request.cookies.get(AUTH_COOKIE);
  if (!token?.value) {
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
