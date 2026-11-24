import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sql from "mssql";

const dir = join(import.meta.dirname, "..", "db", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const pool = await new sql.ConnectionPool({
  server: process.env.DB_SERVER ?? "",
  database: process.env.DB_NAME ?? "",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: true },
  connectionTimeout: 30000,
}).connect();

try {
  for (const file of files) {
    await pool.request().batch(readFileSync(join(dir, file), "utf8"));
    console.log(`applied ${file}`);
  }
} finally {
  await pool.close();
}
