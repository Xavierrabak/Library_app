import "server-only";
import { getPool } from "./db";
import { ServiceError } from "./errors";
import { SESSION_COOKIE, verifySession } from "./sessionToken";

export { SESSION_COOKIE };

// Reads the signed session cookie; returns null when it is missing or has been tampered with.
export async function getActorLoginId(request: Request): Promise<string | null> {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return (await verifySession(rest.join("=")))?.loginId ?? null;
  }
  return null;
}

export async function requireLibrarian(
  loginId: string | null | undefined,
): Promise<string> {
  if (!loginId) {
    throw new ServiceError("UNAUTHENTICATED", "Sign in as a librarian to continue.");
  }
  const pool = await getPool();
  const result = await pool
    .request()
    .input("loginId", loginId)
    .query("SELECT accountType FROM dbo.account WHERE loginID = @loginId");
  const account = result.recordset[0];
  if (!account) {
    throw new ServiceError("UNAUTHENTICATED", "Unknown account.");
  }
  if (account.accountType !== "librarian") {
    throw new ServiceError("FORBIDDEN", "Only librarians can perform this action.");
  }
  return loginId;
}
