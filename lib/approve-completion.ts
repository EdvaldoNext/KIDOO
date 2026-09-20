import type { SupabaseClient } from "@supabase/supabase-js";
import { currentScorePeriod } from "@/lib/dates";

type DecisionInput = {
  completionId: string;
  familyId: string;
  parentId: string | null;
  approve: boolean;
  note?: string | null;
};

export async function decideTaskCompletion(
  admin: SupabaseClient,
  input: DecisionInput,
): Promise<{ ok: true } | { error: string; status: number }> {
  const { data: completion, error: completionError } = await admin
    .from("task_completions")
    .select("id, task_id, family_id, approved_at, rejected_at")
    .eq("id", input.completionId)
    .eq("family_id", input.familyId)
    .maybeSingle();

  if (completionError) {
    return { error: completionError.message, status: 400 };
  }
  if (!completion) {
    return { error: "Foto não encontrada.", status: 404 };
  }

  if (input.approve && completion.approved_at) return { ok: true };
  if (!input.approve && completion.rejected_at) return { ok: true };

  const { data: task, error: taskError } = await admin
    .from("tasks")
    .select("id, kind, weight, family_id, assigned_child_id, score_applied")
    .eq("id", completion.task_id)
    .eq("family_id", input.familyId)
    .maybeSingle();

  if (taskError) {
    return { error: taskError.message, status: 400 };
  }
  if (!task) {
    return { error: "Tarefa não encontrada.", status: 404 };
  }

  if (input.approve) {
    const { error: approveError } = await admin
      .from("task_completions")
      .update({
        approved_by: input.parentId,
        approved_at: new Date().toISOString(),
        rejected_at: null,
        rejection_note: null,
        points_awarded: task.kind === "points" ? task.weight : 0,
      })
      .eq("id", input.completionId)
      .eq("family_id", input.familyId);

    if (approveError) {
      return { error: approveError.message, status: 400 };
    }

    const { error: taskUpdateError } = await admin
      .from("tasks")
      .update({ status: "completed" })
      .eq("id", task.id)
      .eq("family_id", input.familyId);

    if (taskUpdateError) {
      return { error: taskUpdateError.message, status: 400 };
    }

    if (task.kind === "points" && !task.score_applied) {
      const { year, month } = currentScorePeriod();
      const { data: existingScore, error: scoreLoadError } = await admin
        .from("monthly_scores")
        .select("id, credits")
        .eq("family_id", input.familyId)
        .eq("child_id", task.assigned_child_id)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();

      if (scoreLoadError) {
        return { error: scoreLoadError.message, status: 400 };
      }

      if (existingScore) {
        const { error: scoreUpdateError } = await admin
          .from("monthly_scores")
          .update({ credits: (existingScore.credits ?? 0) + task.weight })
          .eq("id", existingScore.id);
        if (scoreUpdateError) {
          return { error: scoreUpdateError.message, status: 400 };
        }
      } else {
        const { error: scoreInsertError } = await admin.from("monthly_scores").insert({
          family_id: task.family_id,
          child_id: task.assigned_child_id,
          year,
          month,
          credits: task.weight,
          debits: 0,
        });
        if (scoreInsertError) {
          return { error: scoreInsertError.message, status: 400 };
        }
      }

      const { error: appliedError } = await admin
        .from("tasks")
        .update({ score_applied: true })
        .eq("id", task.id)
        .eq("family_id", input.familyId);
      if (appliedError) {
        return { error: appliedError.message, status: 400 };
      }
    }
  } else {
    const { error: rejectError } = await admin
      .from("task_completions")
      .update({
        rejected_at: new Date().toISOString(),
        rejection_note: input.note ?? null,
        approved_at: null,
        approved_by: null,
      })
      .eq("id", input.completionId)
      .eq("family_id", input.familyId);

    if (rejectError) {
      return { error: rejectError.message, status: 400 };
    }

    const { error: taskUpdateError } = await admin
      .from("tasks")
      .update({ status: "pending" })
      .eq("id", task.id)
      .eq("family_id", input.familyId);
    if (taskUpdateError) {
      return { error: taskUpdateError.message, status: 400 };
    }
  }

  return { ok: true };
}
