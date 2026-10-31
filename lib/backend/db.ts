import { createClient, type Client } from "@libsql/client";

let cached: Client | null = null;

/**
 * TURSO_DATABASE_URL accepts libsql://, https:// or file: URLs.
 * libsql:// is rewritten to https:// so serverless functions use plain HTTP
 * requests instead of holding a WebSocket open.
 */
export function resolveDatabaseUrl(raw: string | undefined) {
  const url = raw?.trim();
  if (!url) return null;
  if (url.startsWith("libsql://")) return `https://${url.slice("libsql://".length)}`;
  return url;
}

export function getDb(): Client {
  if (cached) return cached;

  const url = resolveDatabaseUrl(process.env.TURSO_DATABASE_URL);
  if (!url) {
    throw new Error("TURSO_DATABASE_URL ausente no servidor.");
  }

  const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
  if (!authToken && !url.startsWith("file:") && !url.startsWith("http://127.0.0.1")) {
    throw new Error("TURSO_AUTH_TOKEN ausente no servidor.");
  }

  cached = createClient({ url, authToken });
  return cached;
}
