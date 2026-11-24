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
