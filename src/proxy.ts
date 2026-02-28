import { NextRequest, NextResponse } from "next/server";

// Routes that require the user to be logged in (customer)
const CUSTOMER_PROTECTED = [
  "/profile",
  "/orders",
  "/checkout",
  "/notifications",
];

// Routes under /admin that are NOT the login page
function isAdminProtected(pathname: string) {
  return pathname.startsWith("/admin") && pathname !== "/admin/login";
}

function isCustomerProtected(pathname: string) {
  return CUSTOMER_PROTECTED.some((path) => pathname.startsWith(path));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = request.cookies.get("isLoggedIn")?.value === "1";
  const isAdmin = request.cookies.get("isAdmin")?.value === "1";

  // ── Protect admin routes ──────────────────────────────────────
  if (isAdminProtected(pathname)) {
    if (!isAdmin) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Redirect logged-in admins away from admin login ──────────
  if (pathname === "/admin/login" && isAdmin) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  // ── Protect customer routes ───────────────────────────────────
  if (isCustomerProtected(pathname)) {
    if (!isLoggedIn) {
      const authUrl = new URL("/auth", request.url);
      authUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(authUrl);
    }
  }

  // ── Redirect logged-in customers away from /auth ─────────────
  if (pathname === "/auth" && isLoggedIn) {
    const redirect = request.nextUrl.searchParams.get("redirect") ?? "/";
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all pages except static assets and API routes
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
