import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "carousel_auth";
// `/api/postprocess` is called server-to-server by Convex actions
// (runGeneration callback + admin reprocess batch). They have no session
// cookie, so we exempt the path. ImageIds are unguessable Convex IDs
// (32-char base32) and the operation is idempotent, so the surface is
// negligible.
const PUBLIC_PATHS = ["/login", "/api/login", "/api/postprocess"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const expected = process.env.AUTH_TOKEN_VALUE;
  if (!expected) {
    // No auth configured (e.g. dev fast-path) — skip gate.
    return NextResponse.next();
  }

  const authCookie = request.cookies.get(AUTH_COOKIE);
  if (!authCookie || authCookie.value !== expected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
