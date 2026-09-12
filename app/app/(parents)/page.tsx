import Link from "next/link";
import { getAppContext } from "@/lib/app-context";
import { FirstSteps } from "@/components/family/FirstSteps";
import { InstallParentApp } from "@/components/family/InstallParentApp";
import { ParentToday } from "@/components/family/ParentToday";
import { sumPaid } from "@/lib/allowance";
import { currentScorePeriod } from "@/lib/dates";
import { loadFamilyReward } from "@/lib/rewards";

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
  const [tasksResult, childrenResult, familyResult, scoresResult, payoutsResult, reward] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, weight, kind, assigned_child_id")
      .eq("family_id", familyId)
      .in("status", ["pending", "awaiting_approval"])
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, display_name").eq("role", "child").eq("family_id", familyId),
    supabase.from("families").select("name, location_24h_enabled").eq("id", familyId).maybeSingle(),
    supabase
      .from("monthly_scores")
      .select("balance")
      .eq("family_id", familyId)
      .eq("year", year)
      .eq("month", month),
    supabase
      .from("allowance_payouts")
      .select("child_id, amount")
      .eq("family_id", familyId)
      .eq("year", year)
      .eq("month", month),
    loadFamilyReward(supabase, familyId),
  ]);

  const tasks = tasksResult.data ?? [];
  const children = childrenResult.data ?? [];
  const monthPoints = (scoresResult.data ?? []).reduce((sum, row) => sum + Number(row.balance ?? 0), 0);
  const monthPaid = sumPaid(payoutsResult.data);

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
        locationOn={Boolean(familyResult.data?.location_24h_enabled)}
      >
        <FirstSteps childCount={children.length} openTaskCount={tasks.length} />
      </ParentToday>
    </div>
  );
}
