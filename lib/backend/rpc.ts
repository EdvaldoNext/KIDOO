/* eslint-disable @typescript-eslint/no-explicit-any */
import type { InStatement } from "@libsql/client";
import { checkPassword } from "@/lib/backend/auth-users";
import { getDb } from "@/lib/backend/db";
import { toDbError, type DbResult, type ScopeResolver } from "@/lib/backend/query";
import { removeFamilyPhotos } from "@/lib/backend/storage";

/**
 * Replacements for the Postgres functions that used to be called with supabase.rpc().
 * `scope` is null for the service client (no user), otherwise the signed-in user.
 */

class RpcError extends Error {}

const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSuffix(length = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => KEY_ALPHABET[byte % KEY_ALPHABET.length]).join("");
}

function fail(message: string): never {
  throw new RpcError(message);
}

async function requireScope(scope: ScopeResolver | null) {
  if (!scope) fail("not_authenticated");
  const resolved = await scope();
  if (!resolved.userId) fail("not_authenticated");
  return resolved;
}

async function requireAdmin(scope: ScopeResolver | null) {
  const resolved = await requireScope(scope);
  if (!resolved.platformAdmin) fail("forbidden");
  return resolved;
}

async function registerParent(scope: ScopeResolver | null, args: Record<string, unknown>) {
  const me = await requireScope(scope);
  const db = getDb();
  if (me.platformAdmin) fail("admin_cannot_join_family");
  if (args.p_lgpd_accepted !== true) fail("lgpd_required");

  const existing = await db.execute({ sql: "SELECT 1 FROM profiles WHERE id = ?", args: [me.userId] });
  if (existing.rows.length > 0) fail("profile_exists");

  const familyName = String(args.p_family_name ?? "").trim();
  const displayName = String(args.p_display_name ?? "").trim();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const casa = `CASA-${randomSuffix()}`;
    const pais = `PAIS-${randomSuffix()}`;
    const clash = await db.execute({
      sql: "SELECT 1 FROM families WHERE kids_access_key = ? OR parent_access_key = ?",
      args: [casa, pais],
    });
    if (clash.rows.length > 0) continue;

    const familyId = crypto.randomUUID();
    await db.batch(
      [
        {
          sql: "INSERT INTO families (id, name, lgpd_accepted_at, kids_access_key, parent_access_key) VALUES (?, ?, ?, ?, ?)",
          args: [familyId, familyName, new Date().toISOString(), casa, pais],
        },
        {
          sql: "INSERT INTO profiles (id, family_id, role, display_name) VALUES (?, ?, 'owner', ?)",
          args: [me.userId, familyId, displayName],
        },
      ],
      "write",
    );
    return familyId;
  }
  return fail("Não foi possível gerar as chaves da família.");
}

async function deleteMyFamily(scope: ScopeResolver | null) {
  const me = await requireScope(scope);
  if (me.role !== "owner" && me.role !== "parent") fail("forbidden");
  if (!me.familyId) fail("forbidden");

  try {
    await removeFamilyPhotos(me.familyId);
  } catch (error) {
    console.error("delete_my_family photos", error);
  }

  await getDb().batch(
    [
      // Children only exist inside this family: remove their (internal) accounts too.
      {
        sql: "DELETE FROM users WHERE id IN (SELECT id FROM profiles WHERE family_id = ? AND role = 'child')",
        args: [me.familyId],
      },
      { sql: "DELETE FROM families WHERE id = ?", args: [me.familyId] },
    ],
    "write",
  );
  return null;
}

async function adminDashboardStats(scope: ScopeResolver | null) {
  await requireAdmin(scope);
  const db = getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [summary, approval, plans] = await Promise.all([
    db.execute({
      sql: `SELECT
        (SELECT count(*) FROM families) AS families_total,
        (SELECT count(*) FROM families WHERE status = 'active') AS families_active,
        (SELECT count(*) FROM families WHERE created_at > ?) AS families_7d,
        (SELECT count(*) FROM profiles WHERE role IN ('owner', 'parent')) AS parents,
        (SELECT count(*) FROM profiles WHERE role = 'child') AS children,
        (SELECT count(*) FROM tasks) AS tasks_total,
        (SELECT count(*) FROM task_completions) AS completions_total,
        (SELECT count(*) FROM task_completions WHERE photo_key IS NOT NULL) AS photos_total`,
      args: [since],
    }),
    db.execute(
      `SELECT count(*) AS decided, sum(CASE WHEN approved_at IS NOT NULL THEN 1 ELSE 0 END) AS approved
       FROM task_completions WHERE approved_at IS NOT NULL OR rejected_at IS NOT NULL`,
    ),
    db.execute("SELECT plan, count(*) AS cnt FROM families GROUP BY plan"),
  ]);

  const head = summary.rows[0] as any;
  const decided = Number((approval.rows[0] as any)?.decided ?? 0);
  const approved = Number((approval.rows[0] as any)?.approved ?? 0);

  return {
    families_total: Number(head.families_total),
    families_active: Number(head.families_active),
    families_7d: Number(head.families_7d),
    parents: Number(head.parents),
    children: Number(head.children),
    tasks_total: Number(head.tasks_total),
    completions_total: Number(head.completions_total),
    photos_total: Number(head.photos_total),
    approval_rate: decided === 0 ? 0 : Math.round((1000 * approved) / decided) / 10,
    plans: Object.fromEntries(plans.rows.map((row: any) => [row.plan, Number(row.cnt)])),
  };
}

async function adminListFamilies(scope: ScopeResolver | null) {
  await requireAdmin(scope);
  const result = await getDb().execute(
    `SELECT
       f.id, f.name, f.plan, f.status,
       (SELECT count(*) FROM profiles p WHERE p.family_id = f.id AND p.role = 'child') AS children_count,
       f.created_at,
       (SELECT p.display_name FROM profiles p WHERE p.family_id = f.id AND p.role = 'owner' LIMIT 1) AS owner_name
     FROM families f
     ORDER BY f.created_at DESC`,
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    plan: row.plan,
    status: row.status,
    children_count: Number(row.children_count),
    created_at: row.created_at,
    owner_name: row.owner_name ?? null,
  }));
}

async function updatePlatformSettings(scope: ScopeResolver | null, args: Record<string, unknown>) {
  await requireAdmin(scope);
  const sets: string[] = ["updated_at = ?"];
  const values: unknown[] = [new Date().toISOString()];
  if (args.p_plan_limits != null) {
    sets.push("plan_limits = ?");
    values.push(JSON.stringify(args.p_plan_limits));
  }
  if (args.p_feature_flags != null) {
    sets.push("feature_flags = ?");
    values.push(JSON.stringify(args.p_feature_flags));
  }
  await getDb().execute({ sql: `UPDATE platform_settings SET ${sets.join(", ")} WHERE id = 1`, args: values as never[] });
  return null;
}

async function setFamilyStatus(scope: ScopeResolver | null, args: Record<string, unknown>) {
  await requireAdmin(scope);
  const status = String(args.p_status ?? "");
  if (status !== "active" && status !== "disabled") fail(`invalid input value for enum family_status: "${status}"`);
  await getDb().execute({
    sql: "UPDATE families SET status = ? WHERE id = ?",
    args: [status, String(args.p_family_id ?? "")],
  });
  return null;
}

/** Applies -weight to every overdue points task and expires it. Returns how many tasks were closed. */
async function closeMonth(scope: ScopeResolver | null) {
  await requireAdmin(scope);
  const db = getDb();
  const now = new Date();
  const nowIso = now.toISOString();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const overdue = await db.execute({
    sql: `SELECT id, family_id, assigned_child_id, weight, score_applied FROM tasks
          WHERE status IN ('pending', 'awaiting_approval')
            AND kind = 'points'
            AND (
              (due_at IS NOT NULL AND due_at < ?1)
              OR (due_at IS NULL AND substr(created_at, 1, 7) < substr(?1, 1, 7))
            )`,
    args: [nowIso],
  });

  const statements: InStatement[] = [];
  for (const row of overdue.rows as any[]) {
    if (row.score_applied) continue;
    statements.push(
      {
        sql: `INSERT INTO monthly_scores (family_id, child_id, year, month, credits, debits)
              VALUES (?, ?, ?, ?, 0, ?)
              ON CONFLICT (child_id, year, month) DO UPDATE SET debits = monthly_scores.debits + excluded.debits`,
        args: [row.family_id, row.assigned_child_id, year, month, -Number(row.weight)],
      },
      { sql: "UPDATE tasks SET score_applied = 1, status = 'expired' WHERE id = ?", args: [row.id] },
    );
  }
  if (statements.length > 0) await db.batch(statements, "write");
  return overdue.rows.length;
}

async function verifyChildPin(scope: ScopeResolver | null, args: Record<string, unknown>) {
  if (scope) fail("forbidden");
  const result = await getDb().execute({
    sql: "SELECT pin_hash FROM profiles WHERE id = ? AND role = 'child'",
    args: [String(args.p_id ?? "")],
  });
  const hash = (result.rows[0]?.pin_hash as string | null | undefined) ?? null;
  return checkPassword(String(args.p_pin ?? ""), hash);
}

export async function callRpc(
  name: string,
  args: Record<string, unknown> = {},
  scope: ScopeResolver | null,
): Promise<DbResult> {
  try {
    let data: unknown;
    switch (name) {
      case "register_parent":
        data = await registerParent(scope, args);
        break;
      case "delete_my_family":
        data = await deleteMyFamily(scope);
        break;
      case "admin_dashboard_stats":
        data = await adminDashboardStats(scope);
        break;
      case "admin_list_families":
        data = await adminListFamilies(scope);
        break;
      case "update_platform_settings":
        data = await updatePlatformSettings(scope, args);
        break;
      case "set_family_status":
        data = await setFamilyStatus(scope, args);
        break;
      case "close_month":
        data = await closeMonth(scope);
        break;
      case "verify_child_pin":
        data = await verifyChildPin(scope, args);
        break;
      case "keep_alive":
        data = new Date().toISOString();
        break;
      default:
        return {
          data: null,
          error: { message: `Could not find the function public.${name} in the schema cache`, code: "PGRST202" },
          count: null,
        };
    }
    return { data, error: null, count: null };
  } catch (error) {
    if (error instanceof RpcError) {
      return { data: null, error: { message: error.message }, count: null };
    }
    return { data: null, error: toDbError(error), count: null };
  }
}
