import { runNextDay } from "@/lib/nextDay";
import { getActorLoginId } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { date?: string };
    const result = await runNextDay(getActorLoginId(request), body.date || undefined);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
