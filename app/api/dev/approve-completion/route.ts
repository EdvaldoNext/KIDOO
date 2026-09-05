import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { DEV_BYPASS_AUTH } from "@/lib/config";

export async function POST(request: Request) {
  if (!DEV_BYPASS_AUTH) {
    return NextResponse.json({ error: "Modo dev desativado." }, { status: 403 });
  }

  const body = (await request.json()) as {
    completion_id?: string;
    approve?: boolean;
    note?: string | null;
  };

  if (!body.completion_id || typeof body.approve !== "boolean") {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const admin = createServiceClient();

  const { data: completion, error: completionError } = await admin
    .from("task_completions")
    .select("id, task_id, family_id, child_id")
    .eq("id", body.completion_id)
    .single();

  if (completionError || !completion) {
    return NextResponse.json({ error: "Conclusão não encontrada." }, { status: 404 });
  }

  const { data: task, error: taskError } = await admin
    .from("tasks")
    .select("id, kind, weight, family_id, assigned_child_id, score_applied")
    .eq("id", completion.task_id)
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
  }

  const { data: owner } = await admin
    .from("profiles")
    .select("id")
    .eq("family_id", completion.family_id)
    .in("role", ["owner", "parent"])
    .limit(1)
    .maybeSingle();

  if (body.approve) {
    const { error: approveError } = await admin
      .from("task_completions")
      .update({
        approved_by: owner?.id ?? null,
        approved_at: new Date().toISOString(),
        rejected_at: null,
        rejection_note: null,
        points_awarded: task.kind === "points" ? task.weight : 0,
      })
      .eq("id", body.completion_id);

    if (approveError) {
      return NextResponse.json({ error: approveError.message }, { status: 400 });
    }

    await admin.from("tasks").update({ status: "completed" }).eq("id", task.id);

    if (task.kind === "points" && !task.score_applied) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const { data: existingScore } = await admin
        .from("monthly_scores")
        .select("id, credits")
        .eq("child_id", task.assigned_child_id)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();

      if (existingScore) {
        await admin
          .from("monthly_scores")
          .update({ credits: (existingScore.credits ?? 0) + task.weight })
          .eq("id", existingScore.id);
      } else {
        await admin.from("monthly_scores").insert({
          family_id: task.family_id,
          child_id: task.assigned_child_id,
          year,
          month,
          credits: task.weight,
          debits: 0,
        });
      }

      await admin.from("tasks").update({ score_applied: true }).eq("id", task.id);
    }
  } else {
    const { error: rejectError } = await admin
      .from("task_completions")
      .update({
        rejected_at: new Date().toISOString(),
        rejection_note: body.note ?? null,
        approved_at: null,
        approved_by: null,
      })
      .eq("id", body.completion_id);

    if (rejectError) {
      return NextResponse.json({ error: rejectError.message }, { status: 400 });
    }

    await admin.from("tasks").update({ status: "pending" }).eq("id", task.id);
  }

  return NextResponse.json({ ok: true });
}
