import "server-only";
import { getPool } from "./db";
import { ServiceError } from "./errors";

// Placeholder until the authentication/session work lands: the login ID is read
// from this cookie, and role checks always go to the account table.
export const SESSION_COOKIE = "lcs_login_id";

export function getActorLoginId(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) {
      const value = decodeURIComponent(rest.join("="));
      return value || null;
    }
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
