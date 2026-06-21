import { NextResponse } from "next/server";
import { destroySession } from "@/server/auth";

/**
 * Clears the session cookie and redirects to /login.
 * Used by requireUser() to recover from stale-cookie situations
 * (e.g. user was deleted, db was reset) since Server Components
 * can't mutate cookies themselves.
 */
export async function GET(request: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.url));
}
