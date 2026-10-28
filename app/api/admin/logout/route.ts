import { NextResponse } from "next/server";

export async function POST() {
  // Two things this must not get wrong, both of which it did:
  //
  // 1. **A relative Location, not a guessed origin.** This used to build an
  //    absolute URL from `NEXT_PUBLIC_BASE_URL`, which is set nowhere in this
  //    project — so every logout, in production too, fell through to the
  //    hard-coded `http://localhost:3000` and left the admin on a dead page.
  //    A browser resolves a relative Location against the page it is on, so
  //    there is no host to know and nothing to configure.
  //
  // 2. **303, not 307.** The logout button is a plain HTML form POST, and
  //    `NextResponse.redirect` defaults to 307, which preserves the method —
  //    the browser would re-POST to `/admin/login`, a page that only answers
  //    GET. 303 is the status that turns the POST into a GET.
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/admin/login" },
  });

  // Delete the session cookie on the same response so the browser actually clears
  // it before following the redirect — setting it separately via cookies() was
  // creating a new response that dropped the deletion header.
  response.cookies.set("admin-session", "", { maxAge: 0, path: "/" });
  return response;
}
