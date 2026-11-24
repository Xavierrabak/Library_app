import { listShelves } from "@/lib/inventory";
import { getActorLoginId, requireLibrarian } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    await requireLibrarian(getActorLoginId(request));
    return Response.json({ ok: true, shelves: await listShelves() });
  } catch (err) {
    return errorResponse(err);
  }
}
