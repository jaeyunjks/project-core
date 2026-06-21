import { NextResponse, type NextRequest } from "next/server";

// Edge-safe: only check cookie presence. Real validation happens
// inside Server Components/Actions via getCurrentUser().
const SESSION_COOKIE = "pc_session";

const PUBLIC_AUTH_ROUTES = ["/login", "/signup"];
const PROTECTED_PREFIXES = ["/dashboard", "/profile"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = PUBLIC_AUTH_ROUTES.includes(pathname);

  // Unauthenticated trying to access protected area → /login
  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated on /login or /signup → /dashboard
  if (isAuthRoute && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/login", "/signup"],
};
