import { getPool } from "@/lib/db";

// Temporary connectivity check; remove once the real queries exist.
export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT DB_NAME() AS db");
    return Response.json({ ok: true, db: result.recordset[0].db });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
