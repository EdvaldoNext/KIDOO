// Applies db/schema.sql to the database in TURSO_DATABASE_URL (idempotent).
//
//   npm run db:setup
//
// Local test database (no Turso account needed):
//   TURSO_DATABASE_URL=file:./.data/kidoo.db npm run db:setup
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@libsql/client";

const rawUrl = process.env.TURSO_DATABASE_URL?.trim();
if (!rawUrl) {
  console.error("Defina TURSO_DATABASE_URL (e TURSO_AUTH_TOKEN) no .env.local.");
  process.exit(1);
}

const url = rawUrl.startsWith("libsql://") ? `https://${rawUrl.slice("libsql://".length)}` : rawUrl;
if (url.startsWith("file:")) {
  mkdirSync(dirname(resolve(url.slice("file:".length))), { recursive: true });
}

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined });
const schema = readFileSync(resolve(import.meta.dirname, "../db/schema.sql"), "utf8");

await db.executeMultiple(schema);

const tables = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
console.log(`Schema aplicado em ${url.startsWith("file:") ? url : new URL(url).host}.`);
console.log("Tabelas:", tables.rows.map((row) => row.name).join(", "));
db.close();
