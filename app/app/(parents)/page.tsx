import Link from "next/link";
import { getAppContext } from "@/lib/app-context";
import { FirstSteps } from "@/components/family/FirstSteps";
import { InstallParentApp } from "@/components/family/InstallParentApp";
import { ParentToday } from "@/components/family/ParentToday";
import { familyAllowanceSnapshot, sumPaid } from "@/lib/allowance";
import { currentScorePeriod } from "@/lib/dates";
import { isAllowanceMoney, loadFamilyReward } from "@/lib/rewards";

export default async function ParentHomePage() {
  const { supabase, familyId } = await getAppContext();

  if (!familyId) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-navy/5">
        <p className="text-navy/70">Nenhuma família ativa.</p>
        <Link href="/cadastro" className="mt-4 inline-block rounded-xl bg-royal px-4 py-2 font-bold text-white">
          Criar família
        </Link>
      </div>
    );
  }

  const { year, month } = currentScorePeriod();
  const [tasksResult, childrenResult, familyResult, scoresResult, payoutsResult, reward, anyTaskResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, weight, kind, assigned_child_id")
      .eq("family_id", familyId)
      .in("status", ["pending", "awaiting_approval"])
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, display_name").eq("role", "child").eq("family_id", familyId),
    supabase.from("families").select("name").eq("id", familyId).maybeSingle(),
    supabase.from("monthly_scores").select("child_id, year, month, balance").eq("family_id", familyId),
    supabase.from("allowance_payouts").select("child_id, year, month, amount").eq("family_id", familyId),
    loadFamilyReward(supabase, familyId),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("family_id", familyId),
  ]);

  const tasks = tasksResult.data ?? [];
  const children = childrenResult.data ?? [];
  const hasTask = (anyTaskResult.count ?? 0) > 0;
  const firstRun = children.length === 0 || !hasTask;
  const scores = scoresResult.data ?? [];
  const payouts = payoutsResult.data ?? [];
  const monthScores = scores.filter((row) => row.year === year && row.month === month);
  const monthPayouts = payouts.filter((row) => row.year === year && row.month === month);
  const monthPoints = monthScores.reduce((sum, row) => sum + Number(row.balance ?? 0), 0);
  const monthPaid = sumPaid(monthPayouts);
  const familyAllowance = isAllowanceMoney(reward)
    ? familyAllowanceSnapshot(scores, payouts, reward, { year, month })
    : null;

  return (
    <div className="space-y-6">
      <InstallParentApp />
      <ParentToday
        familyName={familyResult.data?.name ?? null}
        childrenList={children}
        tasks={tasks}
        monthPoints={monthPoints}
        monthPaid={monthPaid}
        reward={reward}
        allowanceSnapshot={familyAllowance}
        locationOn
        firstRun={firstRun}
      >
        <FirstSteps childCount={children.length} hasTask={hasTask} />
      </ParentToday>
    </div>
  );
}
