import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.redirect(
    new URL("/admin/login", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000")
  );
  // Delete the session cookie on the same response so the browser actually clears
  // it before following the redirect — setting it separately via cookies() was
  // creating a new response that dropped the deletion header.
  response.cookies.set("admin-session", "", { maxAge: 0, path: "/" });
  return response;
}
