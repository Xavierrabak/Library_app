import "server-only";
import sql from "mssql";

const config: sql.config = {
  server: process.env.DB_SERVER ?? "",
  database: process.env.DB_NAME ?? "",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: true, trustServerCertificate: false },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

// Cache the pool on globalThis so dev hot-reloads don't open new connections.
const globalForDb = globalThis as unknown as {
  dbPool?: Promise<sql.ConnectionPool>;
};

export function getPool(): Promise<sql.ConnectionPool> {
  if (!globalForDb.dbPool) {
    globalForDb.dbPool = new sql.ConnectionPool(config)
      .connect()
      .catch((err) => {
        globalForDb.dbPool = undefined;
        throw err;
      });
  }
  return globalForDb.dbPool;
}

export { sql };

const DEADLOCK_VICTIM = 1205;

// Runs `work` in a transaction, rolling back on any error and retrying deadlock victims.
export async function withTransaction<T>(
  work: (tx: sql.Transaction) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const tx = new sql.Transaction(await getPool());
    await tx.begin();
    try {
      const result = await work(tx);
      await tx.commit();
      return result;
    } catch (err) {
      try {
        await tx.rollback();
      } catch {
        // already rolled back by the server
      }
      const number = (err as { number?: number }).number;
      if (number === DEADLOCK_VICTIM && attempt < 3) continue;
      throw err;
    }
  }
}
