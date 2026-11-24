// Signed session cookie helpers. Uses Web Crypto only, so it also runs in proxy.ts.
export const SESSION_COOKIE = "lcs_login_id";

const encoder = new TextEncoder();

function secret(): string {
  const value = process.env.SESSION_SECRET ?? process.env.DB_PASSWORD;
  if (!value) throw new Error("Set SESSION_SECRET (or DB_PASSWORD) in .env to sign sessions.");
  return value;
}

function hmacKey(usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export interface SessionData {
  loginId: string;
  accountType: string;
}

export async function signSession(loginId: string, accountType: string): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify({ l: loginId, r: accountType })));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey("sign"), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

// Returns the session for a genuine, untampered token, otherwise null.
// The role is fixed at login time; role-sensitive actions still re-check the account table.
export async function verifySession(token: string | null | undefined): Promise<SessionData | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const signature = fromBase64Url(token.slice(dot + 1));
  if (!signature) return null;
  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey("verify"),
    signature,
    encoder.encode(payload),
  );
  if (!valid) return null;
  const raw = fromBase64Url(payload);
  if (!raw) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(raw)) as { l?: unknown; r?: unknown };
    return typeof data.l === "string" && typeof data.r === "string"
      ? { loginId: data.l, accountType: data.r }
      : null;
  } catch {
    return null;
  }
}
