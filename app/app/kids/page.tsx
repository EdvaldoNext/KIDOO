import Link from "next/link";
import { AllowanceStatus } from "@/components/family/AllowanceStatus";
import { KidsChildMissions } from "@/components/kids/KidsTaskCard";
import { KidsMascot } from "@/components/kids/KidsMascot";
import { latestRejectionByTask } from "@/components/tasks/RejectionFeedback";
import { getAppContext } from "@/lib/app-context";
import { allowanceSnapshot, paidByChild } from "@/lib/allowance";
import { currentScorePeriod } from "@/lib/dates";
import { formatRewardAmount, isAllowanceMoney, loadFamilyReward } from "@/lib/rewards";

export default async function KidsHomePage() {
  const { supabase, familyId, childId, devMode } = await getAppContext();
  const { year, month } = currentScorePeriod();

  let tasksQuery = supabase
    .from("tasks")
    .select("id, title, status, weight, kind, require_photo, assigned_child_id, due_at")
    .in("status", ["pending", "awaiting_approval"])
    .order("created_at", { ascending: false });

  let childrenQuery = supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "child")
    .order("created_at", { ascending: true });

  let scoresQuery = supabase.from("monthly_scores").select("child_id, balance").eq("year", year).eq("month", month);
  let payoutsQuery = supabase.from("allowance_payouts").select("child_id, amount").eq("year", year).eq("month", month);

  if (familyId) {
    tasksQuery = tasksQuery.eq("family_id", familyId);
    childrenQuery = childrenQuery.eq("family_id", familyId);
    scoresQuery = scoresQuery.eq("family_id", familyId);
    payoutsQuery = payoutsQuery.eq("family_id", familyId);
  }

  const [{ data: tasks }, { data: children }, { data: scores }, { data: payouts }, reward] = await Promise.all([
    tasksQuery,
    childrenQuery,
    scoresQuery,
    payoutsQuery,
    loadFamilyReward(supabase, familyId),
  ]);
  const kids = children ?? [];
  const openTasks = tasks ?? [];

  const pendingTaskIds = openTasks.filter((task) => task.status === "pending").map((task) => task.id);
  let rejectionsByTask = new Map<string, string | null>();

  if (pendingTaskIds.length > 0) {
    let rejectionsQuery = supabase
      .from("task_completions")
      .select("task_id, rejection_note, rejected_at")
      .in("task_id", pendingTaskIds)
      .not("rejected_at", "is", null)
      .order("rejected_at", { ascending: false });

    if (familyId) rejectionsQuery = rejectionsQuery.eq("family_id", familyId);

    const { data: rejections } = await rejectionsQuery;
    rejectionsByTask = latestRejectionByTask(rejections ?? []);
  }

  const canView = devMode || Boolean(childId);
  const manyKids = kids.length > 1;
  const orderedKids = [
    ...kids.filter((kid) => kid.id === childId),
    ...kids.filter((kid) => kid.id !== childId),
  ];
  const money = isAllowanceMoney(reward);
  const focusKid = kids.find((kid) => kid.id === childId) ?? kids[0];
  const focusScore = (scores ?? []).find((row) => row.child_id === focusKid?.id);
  const focusSnapshot =
    money && focusKid ? allowanceSnapshot(focusScore?.balance ?? 0, paidByChild(payouts)[focusKid.id] ?? 0, reward) : null;

  return (
    <div className="space-y-6">
      {!canView ? (
        <div className="rounded-3xl bg-white p-8">
          <KidsMascot size="hero" caption="Peça aos pais o link e a chave da família para entrar." />
        </div>
      ) : (
        <section className="space-y-4">
          {focusKid && focusSnapshot ? (
            <Link href="/app/kids/pontos" className="kids-pop block rounded-3xl bg-white p-4 ring-2 ring-navy/10">
              <p className="text-xs font-extrabold uppercase tracking-wide text-navy/50">Sua mesada</p>
              <p className="mt-1 text-3xl font-extrabold leading-none">{formatRewardAmount(focusScore?.balance ?? 0, reward)}</p>
              <p className="mt-1 font-bold text-navy/70">total do mês</p>
              <AllowanceStatus snapshot={focusSnapshot} voice="child" size="compact" />
            </Link>
          ) : null}
          <h2 className="text-lg font-extrabold sm:text-xl">
            {manyKids ? "Missões da família" : "Suas missões"}
          </h2>
          {kids.length === 0 ? null : manyKids ? (
            orderedKids.map((kid) => (
              <KidsChildMissions
                key={kid.id}
                kid={kid}
                isYou={kid.id === childId}
                tasks={openTasks.filter((task) => task.assigned_child_id === kid.id)}
                reward={reward}
                rejectionsByTask={rejectionsByTask}
              />
            ))
          ) : openTasks.length === 0 ? (
            <div className="rounded-3xl bg-white p-8">
              <KidsMascot size="hero" caption="Mandou bem! Nenhuma missão agora." />
            </div>
          ) : (
            <KidsChildMissions
              kid={kids[0]}
              isYou={!childId || kids[0].id === childId}
              tasks={openTasks}
              reward={reward}
              rejectionsByTask={rejectionsByTask}
            />
          )}
        </section>
      )}
    </div>
  );
}
