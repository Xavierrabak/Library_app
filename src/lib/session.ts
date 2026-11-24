import "server-only";
import { getPool, sql } from "./db";
import { ServiceError } from "./errors";

export interface Profile {
  loginId: string;
  name: string;
  accountType: string;
}

export async function getProfile(loginId: string): Promise<Profile | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.VarChar(100), loginId)
    .query("SELECT loginID, name, accountType FROM dbo.account WHERE loginID = @id");
  const row = result.recordset[0];
  return row ? { loginId: row.loginID, name: row.name, accountType: row.accountType } : null;
}

// Passwords are stored as plain text in the account table, so this is a direct comparison.
export async function verifyLogin(loginId: string, password: string): Promise<Profile | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.VarChar(100), loginId)
    .query("SELECT loginID, name, accountType, password FROM dbo.account WHERE loginID = @id");
  const row = result.recordset[0];
  if (!row || row.loginID !== loginId || row.password !== password) return null;
  return { loginId: row.loginID, name: row.name, accountType: row.accountType };
}

export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 100;

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

// An account matches when the login ID is exact and the name matches ignoring case and extra spaces.
async function requireMatchingAccount(loginId: unknown, name: unknown): Promise<string> {
  if (typeof loginId !== "string" || !loginId.trim() || typeof name !== "string" || !name.trim()) {
    throw new ServiceError("INVALID_INPUT", "Enter your login ID and your name.");
  }
  const id = loginId.trim();
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.VarChar(100), id)
    .query("SELECT loginID, name FROM dbo.account WHERE loginID = @id");
  const row = result.recordset[0];
  if (!row || row.loginID !== id || normalizeName(row.name) !== normalizeName(name)) {
    throw new ServiceError("ACCOUNT_NOT_FOUND", "No account matches that login ID and name.");
  }
  return id;
}

export async function verifyIdentity(loginId: unknown, name: unknown): Promise<void> {
  await requireMatchingAccount(loginId, name);
}

// Re-checks the identity itself, so the update can't be reached without matching the account.
export async function resetPassword(
  loginId: unknown,
  name: unknown,
  newPassword: unknown,
): Promise<void> {
  const id = await requireMatchingAccount(loginId, name);
  if (
    typeof newPassword !== "string" ||
    newPassword.length < MIN_PASSWORD_LENGTH ||
    newPassword.length > MAX_PASSWORD_LENGTH
  ) {
    throw new ServiceError(
      "INVALID_INPUT",
      `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`,
    );
  }
  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.VarChar(100), id)
    .input("pw", sql.VarChar(100), newPassword)
    .query("UPDATE dbo.account SET password = @pw WHERE loginID = @id");
}
