// One-time copy of the data from the old Supabase project to Turso + Cloudflare R2.
//
//   npm run db:migrate-from-supabase              -> dry run (only counts what would be copied)
//   npm run db:migrate-from-supabase -- --apply   -> copies rows and photos
//
// Needed in .env.local (the old project must be restored/unpaused while this runs):
//   MIGRATE_SUPABASE_URL=https://xxxx.supabase.co
//   MIGRATE_SUPABASE_SERVICE_KEY=<service_role key>
//   TURSO_DATABASE_URL / TURSO_AUTH_TOKEN
//   R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET   (only to copy photos)
//
// It is safe to run again: rows that already exist are skipped, photos already in R2 are skipped.
// Password hashes are not exposed by the Supabase API. Set LEGACY_SUPABASE_URL and
// LEGACY_SUPABASE_ANON_KEY in the app so each user is verified against the old project on the
// first login (the password is then stored in Turso).
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@libsql/client";

const apply = process.argv.includes("--apply");
const BUCKET_NAME = "task-photos";

// The old project's keys are usually still in .env.local under their original names.
const FALLBACKS = {
  MIGRATE_SUPABASE_URL: "NEXT_PUBLIC_SUPABASE_URL",
  MIGRATE_SUPABASE_SERVICE_KEY: "SUPABASE_SERVICE_ROLE_KEY",
};

function need(name) {
  const value = (process.env[name] ?? process.env[FALLBACKS[name] ?? ""])?.trim();
  if (!value) {
    console.error(`Defina ${name} no .env.local.`);
    process.exit(1);
  }
  return value;
}

const supabaseUrl = need("MIGRATE_SUPABASE_URL").replace(/\/$/, "");
const supabaseKey = need("MIGRATE_SUPABASE_SERVICE_KEY");
const rawTurso = need("TURSO_DATABASE_URL");
const tursoUrl = rawTurso.startsWith("libsql://") ? `https://${rawTurso.slice("libsql://".length)}` : rawTurso;
const db = createClient({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined });

const authHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

async function fetchAllRows(table) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=${pageSize}&offset=${offset}`, {
      headers: authHeaders,
    });
    if (response.status === 404) return null; // table does not exist in the old project
    if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function fetchAllUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=1000`, {
      headers: authHeaders,
    });
    if (!response.ok) throw new Error(`auth users: ${response.status} ${await response.text()}`);
    const body = await response.json();
    const batch = body.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) break;
  }
  return users;
}

function toIso(value) {
  if (value == null) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

/** Converts a Postgres/PostgREST value into something SQLite stores faithfully. */
function sqlValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

const tableColumnsCache = new Map();
async function writableColumns(table) {
  if (!tableColumnsCache.has(table)) {
    const info = await db.execute(`PRAGMA table_xinfo(${table})`);
    // hidden = 0 is a normal column; generated columns (monthly_scores.balance) can't be inserted
    tableColumnsCache.set(
      table,
      info.rows.filter((row) => Number(row.hidden) === 0).map((row) => String(row.name)),
    );
  }
  return tableColumnsCache.get(table);
}

const TIMESTAMP_COLUMNS = new Set([
  "created_at",
  "updated_at",
  "last_sign_in_at",
  "email_confirmed_at",
  "lgpd_accepted_at",
  "due_at",
  "captured_at",
  "approved_at",
  "rejected_at",
  "last_used_at",
]);

async function insertRows(table, rows) {
  if (rows.length === 0) return 0;
  const columns = await writableColumns(table);
  let inserted = 0;
  const chunkSize = 100;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const statements = rows.slice(index, index + chunkSize).map((row) => {
      const usable = columns.filter((column) => column in row);
      const values = usable.map((column) => {
        const raw = row[column];
        if (TIMESTAMP_COLUMNS.has(column)) return toIso(raw);
        if (table === "task_completions" && column === "storage_provider") return "r2";
        return sqlValue(raw);
      });
      return {
        sql: `INSERT OR IGNORE INTO ${table} (${usable.join(", ")}) VALUES (${usable.map(() => "?").join(", ")})`,
        args: values,
      };
    });
    const results = await db.batch(statements, "write");
    inserted += results.reduce((sum, result) => sum + result.rowsAffected, 0);
  }
  return inserted;
}

function report(label, found, inserted) {
  const suffix = apply ? `${inserted} novas` : "(simulação)";
  console.log(`${label.padEnd(22)} ${String(found).padStart(6)} no Supabase  ->  ${suffix}`);
}

// ---------------------------------------------------------------------------

console.log(apply ? "== MIGRANDO (--apply) ==" : "== SIMULAÇÃO (nada será gravado; use --apply) ==");
console.log(`Origem: ${supabaseUrl}\nDestino: ${tursoUrl.startsWith("file:") ? tursoUrl : new URL(tursoUrl).host}\n`);

// 1. Auth users
const authUsers = await fetchAllUsers();
const userRows = authUsers.map((user) => ({
  id: user.id,
  email: String(user.email ?? "").toLowerCase(),
  email_confirmed_at: user.email_confirmed_at ?? user.confirmed_at ?? null,
  raw_app_meta_data: user.app_metadata ?? {},
  raw_user_meta_data: user.user_metadata ?? {},
  created_at: user.created_at,
  updated_at: user.updated_at ?? user.created_at,
  last_sign_in_at: user.last_sign_in_at ?? null,
}));
const usersInserted = apply ? await insertRows("users", userRows.filter((row) => row.email)) : 0;
report("users", userRows.length, usersInserted);

// 2. Platform admins (from the flag stored on the account)
const adminRows = authUsers
  .filter((user) => user.app_metadata?.platform_admin === true)
  .map((user) => ({ user_id: user.id, created_at: user.created_at }));
const adminsInserted = apply ? await insertRows("platform_admins", adminRows) : 0;
report("platform_admins", adminRows.length, adminsInserted);

// 3. Domain tables, parents before children (foreign keys)
const ORDER = [
  "families",
  "profiles",
  "tasks",
  "task_completions",
  "monthly_scores",
  "child_live_locations",
  "child_location_tokens",
  "push_subscriptions",
  "allowance_payouts",
];

const completions = [];
for (const table of ORDER) {
  const rows = await fetchAllRows(table);
  if (rows === null) {
    console.log(`${table.padEnd(22)} (não existe no Supabase, ignorada)`);
    continue;
  }
  if (table === "task_completions") completions.push(...rows);
  const inserted = apply ? await insertRows(table, rows) : 0;
  report(table, rows.length, inserted);
}

// 4. Platform settings (single row, already seeded by the schema)
const settings = await fetchAllRows("platform_settings");
if (settings?.[0]) {
  if (apply) {
    await db.execute({
      sql: "UPDATE platform_settings SET plan_limits = ?, feature_flags = ? WHERE id = 1",
      args: [JSON.stringify(settings[0].plan_limits), JSON.stringify(settings[0].feature_flags)],
    });
  }
  console.log(`${"platform_settings".padEnd(22)}      1 no Supabase  ->  ${apply ? "atualizada" : "(simulação)"}`);
}

// 5. Photos: Supabase Storage -> R2, same object keys
const photoKeys = [...new Set(completions.map((row) => row.photo_key).filter(Boolean))];
console.log(`\nFotos referenciadas: ${photoKeys.length}`);

if (apply && photoKeys.length > 0) {
  const accountId = need("R2_ACCOUNT_ID");
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: need("R2_ACCESS_KEY_ID"), secretAccessKey: need("R2_SECRET_ACCESS_KEY") },
  });
  const bucket = need("R2_BUCKET");

  let copied = 0;
  let skipped = 0;
  let missing = 0;
  for (const key of photoKeys) {
    try {
      await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      skipped += 1;
      continue;
    } catch {
      // not in R2 yet, copy it
    }

    const encoded = key.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${encoded}`, {
      headers: authHeaders,
    });
    if (!response.ok) {
      missing += 1; // already purged by the daily job, or never uploaded
      continue;
    }
    const body = new Uint8Array(await response.arrayBuffer());
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: response.headers.get("content-type") ?? "image/jpeg",
      }),
    );
    copied += 1;
    if (copied % 25 === 0) console.log(`  ... ${copied} fotos copiadas`);
  }
  console.log(`Fotos: ${copied} copiadas, ${skipped} já estavam no R2, ${missing} sem arquivo na origem.`);
}

// 6. Sanity check on the destination
if (apply) {
  console.log("\nTotais no Turso:");
  for (const table of ["users", "families", "profiles", "tasks", "task_completions", "monthly_scores"]) {
    const result = await db.execute(`SELECT COUNT(*) AS n FROM ${table}`);
    console.log(`  ${table.padEnd(18)} ${result.rows[0].n}`);
  }
} else {
  console.log("\nTudo certo para migrar. Rode de novo com --apply.");
}

db.close();
