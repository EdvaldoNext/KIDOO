/**
 * Column metadata for every table the query layer may touch.
 * - `bools`: stored as INTEGER 0/1, returned as true/false
 * - `json`:  stored as TEXT, returned parsed
 * - `ts`:    ISO-8601 UTC strings. Values without a timezone are treated as UTC,
 *            matching how Postgres cast them for the old timestamptz columns.
 */
export type TableMeta = {
  columns: string[];
  pk: string[];
  bools?: string[];
  json?: string[];
  ts?: string[];
};

export const TABLES: Record<string, TableMeta> = {
  families: {
    columns: [
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
      "kids_access_key",
      "parent_access_key",
      "created_at",
    ],
    pk: ["id"],
    bools: ["location_24h_enabled"],
    ts: ["lgpd_accepted_at", "created_at"],
  },
  profiles: {
    columns: ["id", "family_id", "role", "display_name", "age_group", "invite_code", "pin_hash", "created_at"],
    pk: ["id"],
    ts: ["created_at"],
  },
  tasks: {
    columns: [
      "id",
      "family_id",
      "created_by",
      "assigned_child_id",
      "kind",
      "title",
      "description",
      "weight",
      "due_at",
      "require_photo",
      "status",
      "score_applied",
      "created_at",
    ],
    pk: ["id"],
    bools: ["require_photo", "score_applied"],
    ts: ["due_at", "created_at"],
  },
  task_completions: {
    columns: [
      "id",
      "family_id",
      "task_id",
      "child_id",
      "photo_key",
      "storage_provider",
      "lat",
      "lng",
      "location_available",
      "captured_at",
      "approved_by",
      "approved_at",
      "rejected_at",
      "rejection_note",
      "points_awarded",
      "child_note",
      "created_at",
    ],
    pk: ["id"],
    bools: ["location_available"],
    ts: ["captured_at", "approved_at", "rejected_at", "created_at"],
  },
  monthly_scores: {
    columns: ["id", "family_id", "child_id", "year", "month", "credits", "debits", "balance"],
    pk: ["id"],
  },
  platform_settings: {
    columns: ["id", "plan_limits", "feature_flags", "updated_at"],
    pk: ["id"],
    json: ["plan_limits", "feature_flags"],
    ts: ["updated_at"],
  },
  child_live_locations: {
    columns: [
      "child_id",
      "family_id",
      "lat",
      "lng",
      "accuracy_m",
      "heading",
      "speed_mps",
      "captured_at",
      "sharing",
      "source",
    ],
    pk: ["child_id"],
    bools: ["sharing"],
    ts: ["captured_at"],
  },
  child_location_tokens: {
    columns: ["token_hash", "child_id", "family_id", "created_at", "last_used_at"],
    pk: ["token_hash"],
    ts: ["created_at", "last_used_at"],
  },
  push_subscriptions: {
    columns: ["id", "user_id", "endpoint", "p256dh", "auth", "user_agent", "created_at", "updated_at"],
    pk: ["id"],
    ts: ["created_at", "updated_at"],
  },
  allowance_payouts: {
    columns: ["id", "family_id", "child_id", "year", "month", "amount", "paid_by", "created_at"],
    pk: ["id"],
    ts: ["created_at"],
  },
};

const NO_ZONE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/** Normalizes any timestamp input to the canonical ISO string stored in the database. */
export function normalizeTimestamp(value: unknown): unknown {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return value;

  const text = value.trim();
  const candidate = NO_ZONE.test(text) ? `${text.replace(" ", "T")}Z` : text;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function serializeValue(meta: TableMeta, column: string, value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  if (meta.ts?.includes(column)) return normalizeTimestamp(value);
  if (meta.json?.includes(column)) return typeof value === "string" ? value : JSON.stringify(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

export function deserializeRow(meta: TableMeta, row: Record<string, unknown>) {
  for (const column of meta.bools ?? []) {
    if (column in row && row[column] != null) row[column] = Boolean(row[column]);
  }
  for (const column of meta.json ?? []) {
    const raw = row[column];
    if (typeof raw === "string") {
      try {
        row[column] = JSON.parse(raw);
      } catch {
        // leave the raw string untouched
      }
    }
  }
  return row;
}
