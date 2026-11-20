import type { InStatement } from "@libsql/client";
import { createServiceClient } from "@/lib/backend/admin";
import { getDb } from "@/lib/backend/db";
import { currentScorePeriod } from "@/lib/dates";
import {
  ALL_WEEKDAYS,
  isValidClock,
  saoPauloDueIso,
  saoPauloToday,
  saoPauloWeekday,
  weekdayMask,
} from "@/lib/routine-rules";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TaskDraft = {
  title: string;
  childId: string;
  kind: "points" | "reminder";
  description: string | null;
  weight: number;
  dueAt: string | null;
  requirePhoto: boolean;
  repeat: "once" | "daily" | "weekdays";
  weekdays: number;
  timeLocal: string | null;
};

type RoutineRow = {
  id: string;
  family_id: string;
  created_by: string;
  assigned_child_id: string;
  kind: string;
  title: string;
  description: string | null;
  weight: number;
  require_photo: boolean;
  weekdays: number;
  time_local: string | null;
};

export function parseTaskBody(body: unknown): { ok: true; value: TaskDraft } | { ok: false; error: string } {
  const raw = (body ?? {}) as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const childId = typeof raw.child_id === "string" ? raw.child_id : "";
  const kind = raw.kind === "reminder" ? "reminder" : "points";
  const repeat = raw.repeat === "daily" || raw.repeat === "weekdays" ? raw.repeat : "once";

  if (!title || !UUID_RE.test(childId)) {
    return { ok: false, error: "Título e filho são obrigatórios." };
  }
  if (title.length > 80) {
    return { ok: false, error: "O título pode ter no máximo 80 letras." };
  }

  const description = typeof raw.description === "string" && raw.description.trim() ? raw.description.trim() : null;
  const weight = kind === "points" ? Number(raw.weight ?? 1) : 0;
  if (kind === "points" && (!Number.isInteger(weight) || weight < 1 || weight > 20)) {
    return { ok: false, error: "Os pontos precisam ser um número de 1 a 20." };
  }

  let weekdays = 0;
  let timeLocal: string | null = null;
  if (repeat !== "once") {
    weekdays = repeat === "daily" ? ALL_WEEKDAYS : weekdayMask(Array.isArray(raw.weekdays) ? (raw.weekdays as number[]) : []);
    if (weekdays < 1 || weekdays > ALL_WEEKDAYS) {
      return { ok: false, error: "Escolha pelo menos um dia da semana." };
    }
    if (typeof raw.time_local === "string" && raw.time_local.trim()) {
      timeLocal = raw.time_local.trim();
      if (!isValidClock(timeLocal)) {
        return { ok: false, error: "Horário inválido." };
      }
    }
  }

  const dueAt = repeat === "once" && typeof raw.due_at === "string" && raw.due_at ? raw.due_at : null;

  return {
    ok: true,
    value: {
      title,
      childId,
      kind,
      description,
      weight,
      dueAt,
      requirePhoto: kind === "points" ? true : Boolean(raw.require_photo),
      repeat,
      weekdays,
      timeLocal,
    },
  };
}

async function expireMissedRoutineTasks(familyId: string, today: string) {
  const db = getDb();
  const overdue = await db.execute({
    sql: `SELECT id, family_id, assigned_child_id, weight, kind
          FROM tasks
          WHERE family_id = ?
            AND routine_id IS NOT NULL
            AND status = 'pending'
            AND occurs_on IS NOT NULL
            AND occurs_on < ?
            AND score_applied = 0`,
    args: [familyId, today],
  });
  if (overdue.rows.length === 0) return;

  const { year, month } = currentScorePeriod();
  for (const row of overdue.rows) {
    const updated = await db.execute({
      sql: "UPDATE tasks SET score_applied = 1, status = 'expired' WHERE id = ? AND status = 'pending' AND score_applied = 0",
      args: [String(row.id)],
    });
    if (Number(updated.rowsAffected ?? 0) !== 1) continue;
    if (row.kind !== "points" || Number(row.weight) <= 0) continue;
    await db.execute({
      sql: `INSERT INTO monthly_scores (family_id, child_id, year, month, credits, debits)
            VALUES (?, ?, ?, ?, 0, ?)
            ON CONFLICT (child_id, year, month) DO UPDATE SET debits = monthly_scores.debits + excluded.debits`,
      args: [row.family_id, row.assigned_child_id, year, month, -Number(row.weight)],
    });
  }
}

/** Creates today's occurrence for each active routine, and closes pending days that already passed. */
export async function ensureFamilyRoutineTasks(familyId: string) {
  const admin = createServiceClient();
  const today = saoPauloToday();
  const bit = 1 << saoPauloWeekday();

  const { data: routines, error } = await admin
    .from("task_routines")
    .select("id, family_id, created_by, assigned_child_id, kind, title, description, weight, require_photo, weekdays, time_local")
    .eq("family_id", familyId)
    .eq("active", true);
  if (error) throw new Error(error.message);

  await expireMissedRoutineTasks(familyId, today);

  const due = ((routines ?? []) as RoutineRow[]).filter((routine) => (Number(routine.weekdays) & bit) !== 0);
  if (due.length === 0) return;

  const { data: existing, error: existingError } = await admin
    .from("tasks")
    .select("routine_id")
    .eq("family_id", familyId)
    .eq("occurs_on", today)
    .in(
      "routine_id",
      due.map((routine) => routine.id),
    );
  if (existingError) throw new Error(existingError.message);

  const have = new Set((existing ?? []).map((row) => row.routine_id as string));
  const missing = due.filter((routine) => !have.has(routine.id));
  if (missing.length === 0) return;

  const statements: InStatement[] = missing.map((routine) => ({
    sql: `INSERT INTO tasks (
            family_id, created_by, assigned_child_id, kind, title, description, weight,
            due_at, require_photo, status, score_applied, routine_id, occurs_on
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)
          ON CONFLICT (routine_id, occurs_on) WHERE routine_id IS NOT NULL DO NOTHING`,
    args: [
      routine.family_id,
      routine.created_by,
      routine.assigned_child_id,
      routine.kind,
      routine.title,
      routine.description,
      routine.kind === "points" ? Number(routine.weight) : 0,
      routine.time_local ? saoPauloDueIso(today, routine.time_local) : null,
      routine.require_photo ? 1 : 0,
      routine.id,
      today,
    ],
  }));
  await getDb().batch(statements, "write");
}

export async function createFamilyTask(familyId: string, parentId: string, draft: TaskDraft) {
  const admin = createServiceClient();
  const { data: child } = await admin
    .from("profiles")
    .select("id")
    .eq("id", draft.childId)
    .eq("family_id", familyId)
    .eq("role", "child")
    .maybeSingle();
  if (!child) {
    return { ok: false as const, error: "Filho não encontrado nesta família.", status: 404 };
  }

  if (draft.repeat === "once") {
    const { error } = await admin.from("tasks").insert({
      family_id: familyId,
      created_by: parentId,
      assigned_child_id: draft.childId,
      kind: draft.kind,
      title: draft.title,
      description: draft.description,
      weight: draft.weight,
      due_at: draft.dueAt,
      require_photo: draft.requirePhoto,
    });
    if (error) return { ok: false as const, error: error.message, status: 400 };
    return { ok: true as const, createdToday: true };
  }

  const { error } = await admin.from("task_routines").insert({
    family_id: familyId,
    created_by: parentId,
    assigned_child_id: draft.childId,
    kind: draft.kind,
    title: draft.title,
    description: draft.description,
    weight: draft.weight,
    require_photo: draft.requirePhoto,
    weekdays: draft.weekdays,
    time_local: draft.timeLocal,
    active: true,
  });
  if (error) return { ok: false as const, error: error.message, status: 400 };

  await ensureFamilyRoutineTasks(familyId);
  const createdToday = (draft.weekdays & (1 << saoPauloWeekday())) !== 0;
  return { ok: true as const, createdToday };
}
