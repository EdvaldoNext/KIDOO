import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/backend/db";

const TOKEN_TTL_MS = 60 * 60 * 1000;
const MIN_INTERVAL_MS = 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a one-hour reset token. Returns null when one was issued less than a minute ago. */
export async function createResetToken(userId: string) {
  const db = getDb();
  const recent = await db.execute({
    sql: "SELECT created_at FROM password_resets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    args: [userId],
  });
  const last = recent.rows[0]?.created_at as string | undefined;
  if (last && Date.now() - new Date(last).getTime() < MIN_INTERVAL_MS) return null;

  const token = randomBytes(32).toString("hex");
  const now = new Date();
  await db.batch(
    [
      { sql: "DELETE FROM password_resets WHERE user_id = ? OR expires_at < ?", args: [userId, now.toISOString()] },
      {
        sql: "INSERT INTO password_resets (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        args: [hashToken(token), userId, now.toISOString(), new Date(now.getTime() + TOKEN_TTL_MS).toISOString()],
      },
    ],
    "write",
  );
  return token;
}

/** Validates and burns a reset token. Returns the user id, or null when invalid/expired/used. */
export async function consumeResetToken(token: string) {
  if (!/^[0-9a-f]{64}$/i.test(token)) return null;
  const db = getDb();
  const hash = hashToken(token);
  const nowIso = new Date().toISOString();

  const result = await db.execute({
    sql: `UPDATE password_resets SET used_at = ?
          WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
          RETURNING user_id`,
    args: [nowIso, hash, nowIso],
  });
  return (result.rows[0]?.user_id as string | undefined) ?? null;
}
