import { returnCopy } from "@/lib/inventory";
import { getActorLoginId } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await returnCopy(getActorLoginId(request), body);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
