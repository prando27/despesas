import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Better Auth handles its own routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Public pages
  if (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/invite")) {
    return NextResponse.next();
  }

  // Check for Better Auth session cookie
  const sessionToken =
    req.cookies.get("better-auth.session_token")?.value ||
    req.cookies.get("__Secure-better-auth.session_token")?.value;

  // Public API routes (no auth needed)
  if (pathname.startsWith("/api/groups/info")) {
    return NextResponse.next();
  }

  // API routes need auth
  if (pathname.startsWith("/api/") && !sessionToken) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Pages need auth
  if (!pathname.startsWith("/api/") && !pathname.startsWith("/_next") && !sessionToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
