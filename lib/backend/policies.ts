import type { UserRole } from "@/lib/auth";
import { getDb } from "@/lib/backend/db";

/**
 * Application-level replacement for the Postgres RLS policies.
 * Only the "user scoped" client (createClient) goes through these rules; the service
 * client (createServiceClient) is unrestricted, exactly like the old service role key.
 */
export type Scope = {
  userId: string | null;
  familyId: string | null;
  role: UserRole | null;
  platformAdmin: boolean;
};

export type ScopeClaims = {
  sub?: string | null;
  app_metadata?: { platform_admin?: boolean } | null;
};

/** Reads the truth from the database (profiles / platform_admins), like private.current_family_id(). */
export async function resolveScope(claims: ScopeClaims | null): Promise<Scope> {
  const userId = claims?.sub ?? null;
  const claimedAdmin = claims?.app_metadata?.platform_admin === true;
  if (!userId) {
    return { userId: null, familyId: null, role: null, platformAdmin: false };
  }

  const result = await getDb().execute({
    sql: `SELECT
            (SELECT family_id FROM profiles WHERE id = ?1) AS family_id,
            (SELECT role FROM profiles WHERE id = ?1) AS role,
            (SELECT 1 FROM platform_admins WHERE user_id = ?1) AS is_admin`,
    args: [userId],
  });
  const row = result.rows[0];
  return {
    userId,
    familyId: (row?.family_id as string | null | undefined) ?? null,
    role: ((row?.role as UserRole | null | undefined) ?? null) as UserRole | null,
    platformAdmin: claimedAdmin || row?.is_admin === 1,
  };
}

export type ReadRule =
  | { kind: "all" }
  | { kind: "none" }
  | { kind: "where"; sql: string; args: unknown[] };

export type TablePolicy = {
  /** Columns a user-scoped client may read. Defaults to every column. */
  readable?: string[];
  read: (scope: Scope) => ReadRule;
};

const ALL: ReadRule = { kind: "all" };
const NONE: ReadRule = { kind: "none" };

function byFamily(scope: Scope): ReadRule {
  if (scope.platformAdmin) return ALL;
  if (!scope.familyId) return NONE;
  return { kind: "where", sql: "family_id = ?", args: [scope.familyId] };
}

const FAMILY_SAFE_COLUMNS = [
  "id",
  "name",
  "plan",
  "status",
  "reward_mode",
  "points_per_currency",
  "currency_amount",
  "reward_note",
  "location_24h_enabled",
  "lgpd_accepted_at",
  "created_at",
];

export const POLICIES: Record<string, TablePolicy> = {
  families: {
    // kids_access_key / parent_access_key are door secrets: never readable by sessions.
    readable: FAMILY_SAFE_COLUMNS,
    read: (scope) => {
      if (scope.platformAdmin) return ALL;
      if (!scope.familyId) return NONE;
      return { kind: "where", sql: "id = ?", args: [scope.familyId] };
    },
  },
  profiles: {
    readable: ["id", "family_id", "role", "display_name", "age_group", "invite_code", "created_at"],
    read: (scope) => {
      if (scope.platformAdmin) return ALL;
      const parts: string[] = [];
      const args: unknown[] = [];
      if (scope.userId) {
        parts.push("id = ?");
        args.push(scope.userId);
      }
      if (scope.familyId) {
        parts.push("family_id = ?");
        args.push(scope.familyId);
      }
      if (parts.length === 0) return NONE;
      return { kind: "where", sql: `(${parts.join(" OR ")})`, args };
    },
  },
  tasks: { read: byFamily },
  task_completions: { read: byFamily },
  monthly_scores: { read: byFamily },
  allowance_payouts: { read: byFamily },
  child_live_locations: { read: byFamily },
  push_subscriptions: {
    readable: ["id", "user_id", "endpoint", "created_at", "updated_at", "user_agent"],
    read: (scope) => {
      if (scope.platformAdmin) return ALL;
      if (!scope.userId) return NONE;
      return { kind: "where", sql: "user_id = ?", args: [scope.userId] };
    },
  },
  platform_settings: {
    readable: ["id", "plan_limits", "feature_flags", "updated_at"],
    read: (scope) => {
      if (scope.platformAdmin) return ALL;
      return scope.role === "owner" || scope.role === "parent" ? ALL : NONE;
    },
  },
  // No client policy at all: only the service client can touch it.
  child_location_tokens: { read: () => NONE },
};

/** Mirrors the storage.objects policy: a family's folder, parents see all, a child sees its own. */
export function canReadPhoto(scope: Scope, key: string) {
  if (!scope.familyId) return false;
  const parts = key.split("/");
  if (parts[0] !== "families" || parts[1] !== scope.familyId) return false;
  if (scope.role === "owner" || scope.role === "parent") return true;
  return parts[3] === scope.userId;
}
