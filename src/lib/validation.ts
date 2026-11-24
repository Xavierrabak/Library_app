import { ServiceError } from "./errors";

export function normalizeIsbn(raw: unknown): string | null {
  const digits = String(raw ?? "").replace(/[\s-]/g, "");
  return /^\d{13}$/.test(digits) ? digits : null;
}

export function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === Number(isbn[12]);
}

export function parsePositiveInt(value: unknown, label: string): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1) {
    throw new ServiceError("INVALID_INPUT", `${label} must be a positive whole number.`);
  }
  return n;
}

export function requireText(value: unknown, label: string, maxLength: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new ServiceError("INVALID_INPUT", `${label} is required.`);
  if (text.length > maxLength) {
    throw new ServiceError("INVALID_INPUT", `${label} must be ${maxLength} characters or fewer.`);
  }
  return text;
}

export function optionalText(value: unknown, label: string, maxLength: number): string | null {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return requireText(value, label, maxLength);
}

export function parseIsoDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ServiceError("INVALID_INPUT", "Date must be in YYYY-MM-DD format.");
  }
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new ServiceError("INVALID_INPUT", "Date is not a real calendar date.");
  }
  return value;
}

export function todayIso(): string {
  return new Date().toLocaleDateString("en-CA");
}
