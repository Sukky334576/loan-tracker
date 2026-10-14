import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("loan_tracker_session");
  const isAuthenticated = Boolean(sessionCookie?.value);

  // 1. Allow public customer signing routes and static assets
  if (
    pathname.startsWith("/sign") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // static files like favicon.ico, images, icons
  ) {
    return NextResponse.next();
  }

  // 2. If user is at /login
  if (pathname === "/login") {
    if (isAuthenticated) {
      // Already logged in -> redirect to home
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 3. Protected routes: if not authenticated, redirect to /login
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon-*.png
     */
    "/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png$).*)",
  ],
};
