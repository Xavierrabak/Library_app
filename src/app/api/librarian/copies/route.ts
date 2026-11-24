import { removeCopy, searchCopies } from "@/lib/inventory";
import { getActorLoginId, requireLibrarian } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    await requireLibrarian(getActorLoginId(request));
    const q = new URL(request.url).searchParams.get("q") ?? "";
    return Response.json({ ok: true, copies: await searchCopies(q) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await removeCopy(getActorLoginId(request), body);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
