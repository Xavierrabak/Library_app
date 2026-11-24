import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/sessionToken";

// Reachable without logging in: the login page, password reset, and the session endpoint.
const PUBLIC_PATHS = ["/", "/ForgotPassword", "/api/session", "/api/password-reset"];
const LIBRARIAN_ONLY = ["/AdminDash", "/CreateAccount", "/api/librarian"];

function isLibrarianOnly(pathname: string): boolean {
  return LIBRARIAN_ONLY.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

// Everything else requires a signed session cookie, and librarian-only areas additionally
// require a librarian account.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isApi = pathname.startsWith("/api/");

  if (!session) {
    if (isApi) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHENTICATED", error: "Sign in to continue." },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isLibrarianOnly(pathname) && session.accountType !== "librarian") {
    if (isApi) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", error: "Only librarians can perform this action." },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/UserDash", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"],
};
