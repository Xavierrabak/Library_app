export interface ApiResult {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

export async function callApi(
  url: string,
  method: "GET" | "POST" | "DELETE",
  body?: unknown,
): Promise<ApiResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as ApiResult | null;
    return data ?? { ok: false, error: `Request failed (${response.status}).` };
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}

export interface ShelfOption {
  id: number;
  capacity: number;
  count: number;
}

export function shelfLabel(shelf: ShelfOption): string {
  return `Shelf ${shelf.id} (${shelf.count}/${shelf.capacity})`;
}

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200";

export const buttonClass =
  "rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60";
