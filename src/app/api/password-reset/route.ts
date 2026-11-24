import { errorResponse } from "@/lib/errors";
import { resetPassword, verifyIdentity } from "@/lib/session";

// Without newPassword this only checks the login ID and name; with it, the password is updated.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      loginID?: unknown;
      name?: unknown;
      newPassword?: unknown;
    };
    if (body.newPassword === undefined) {
      await verifyIdentity(body.loginID, body.name);
    } else {
      await resetPassword(body.loginID, body.name, body.newPassword);
    }
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
