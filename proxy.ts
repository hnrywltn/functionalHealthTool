import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const SET_PASSWORD = "/set-password";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    return session ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (session) {
    // A temp-password session can only reach the set-password page until it picks a new one.
    if (session.mustChangePassword && pathname !== SET_PASSWORD) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Password change required" }, { status: 403 });
      return NextResponse.redirect(new URL(SET_PASSWORD, request.url));
    }
    if (!session.mustChangePassword && pathname === SET_PASSWORD) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // api/webhooks/stripe is called by Stripe (no session); it verifies its own signature.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks/stripe).*)"],
};
