// Makes an account a KIDOO platform admin (replacement for supabase/promote_admin.sql).
//
//   npm run db:promote-admin -- admin@dominio.com
//   npm run db:promote-admin -- admin@dominio.com "senha-com-8+-caracteres"   (creates it if missing)
//
// The same account can also own a family. Admin login stays at /admin/login.
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const [emailArg, password] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
if (!email) {
  console.error('Uso: npm run db:promote-admin -- email@dominio.com ["senha"]');
  process.exit(1);
}

const rawUrl = process.env.TURSO_DATABASE_URL?.trim();
if (!rawUrl) {
  console.error("Defina TURSO_DATABASE_URL (e TURSO_AUTH_TOKEN) no .env.local.");
  process.exit(1);
}
const url = rawUrl.startsWith("libsql://") ? `https://${rawUrl.slice("libsql://".length)}` : rawUrl;
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined });

let user = (await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] })).rows[0];

if (!user) {
  if (!password || password.length < 8) {
    console.error("Conta não existe. Passe uma senha (mín. 8 caracteres) para criá-la.");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, created_at, updated_at)
          VALUES (?, ?, ?, '{"platform_admin":true}', ?, ?)`,
    args: [email, hash, now, now, now],
  });
  user = (await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] })).rows[0];
  console.log("Conta criada.");
}

await db.execute({
  sql: `UPDATE users
        SET raw_app_meta_data = json_set(COALESCE(NULLIF(raw_app_meta_data, ''), '{}'), '$.platform_admin', json('true')),
            updated_at = ?
        WHERE id = ?`,
  args: [new Date().toISOString(), user.id],
});
await db.execute({ sql: "INSERT OR IGNORE INTO platform_admins (user_id) VALUES (?)", args: [user.id] });

console.log(`${email} agora é admin da plataforma (entre em /admin/login).`);
db.close();
