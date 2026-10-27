import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("admin-session")?.value;
  const { pathname } = request.nextUrl;

  // A cheap first gate only. Middleware runs on the Edge runtime and cannot
  // load firebase-admin, so it can see that a cookie exists but not whether it
  // still verifies — `(dashboard)/layout.tsx` does the real check with
  // getAdminSession().
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // There is deliberately no "already logged in, skip the login page" redirect
  // here. Sending a request with a cookie from /admin/login to /admin created a
  // loop the moment that cookie stopped verifying: the layout bounced it back
  // to /admin/login, middleware bounced it to /admin again, and the admin panel
  // became unreachable with ERR_TOO_MANY_REDIRECTS until the user cleared their
  // cookies by hand. An admin session lasts 14 days, so every admin hits this
  // eventually. The gain was cosmetic; the failure was a locked-out admin.
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};