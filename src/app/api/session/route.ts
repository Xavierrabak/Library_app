import { cookies } from "next/headers";
import { SESSION_COOKIE, signSession } from "@/lib/sessionToken";
import { verifyLogin } from "@/lib/session";

// Localhost-only session handling: the cookie holds the login ID plus an HMAC signature.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    loginID?: unknown;
    password?: unknown;
  };
  if (typeof body.loginID !== "string" || typeof body.password !== "string") {
    return Response.json({ ok: false, error: "Enter your username and password." }, { status: 400 });
  }
  const profile = await verifyLogin(body.loginID.trim(), body.password);
  if (!profile) {
    return Response.json({ ok: false, error: "Incorrect username or password." }, { status: 401 });
  }
  (await cookies()).set(SESSION_COOKIE, await signSession(profile.loginId, profile.accountType), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return Response.json({ ok: true, accountType: profile.accountType });
}

export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
