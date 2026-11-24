import { addBook } from "@/lib/inventory";
import { getActorLoginId } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await addBook(await getActorLoginId(request), body);
    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
