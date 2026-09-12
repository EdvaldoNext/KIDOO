import { BrandLogo } from "@/components/BrandLogo";
import { getAppContext } from "@/lib/app-context";
import { KidsMascot } from "@/components/kids/KidsMascot";
import { KidsRallyNudge } from "@/components/kids/KidsRallyNudge";
import { KidsScoreboard } from "@/components/kids/KidsScoreboard";
import { paidByChild } from "@/lib/allowance";
import { currentScorePeriod } from "@/lib/dates";
import { isAllowanceMoney, kidsPointsTitle, loadFamilyReward } from "@/lib/rewards";

export default async function KidsPointsPage() {
  const { supabase, familyId, childId, devMode } = await getAppContext();
  const { year, month } = currentScorePeriod();

  let scoresQuery = supabase
    .from("monthly_scores")
    .select("child_id, credits, debits, balance")
    .eq("year", year)
    .eq("month", month);

  let childrenQuery = supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "child")
    .order("created_at", { ascending: true });

  let tasksQuery = supabase
    .from("tasks")
    .select("assigned_child_id, weight, kind")
    .in("status", ["pending", "awaiting_approval"]);

  let payoutsQuery = supabase.from("allowance_payouts").select("child_id, amount").eq("year", year).eq("month", month);

  if (familyId) {
    scoresQuery = scoresQuery.eq("family_id", familyId);
    childrenQuery = childrenQuery.eq("family_id", familyId);
    tasksQuery = tasksQuery.eq("family_id", familyId);
    payoutsQuery = payoutsQuery.eq("family_id", familyId);
  }

  const [{ data: scores }, { data: kids }, { data: tasks }, { data: payouts }, reward] = await Promise.all([
    scoresQuery,
    childrenQuery,
    tasksQuery,
    payoutsQuery,
    loadFamilyReward(supabase, familyId),
  ]);

  const pendingByChild: Record<string, number> = {};
  for (const task of tasks ?? []) {
    if (task.kind !== "points") continue;
    pendingByChild[task.assigned_child_id] = (pendingByChild[task.assigned_child_id] ?? 0) + (task.weight ?? 0);
  }

  const title = (kids ?? []).length > 1
    ? isAllowanceMoney(reward)
      ? "Mesada da família"
      : "Placar da família"
    : kidsPointsTitle(reward, devMode);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <BrandLogo size="header" wordmark={false} />
          <h2 className="text-lg font-extrabold sm:text-xl">{title}</h2>
        </div>
        {isAllowanceMoney(reward) ? (
          <p className="text-sm font-bold text-navy/70">
            O total do mês continua mesmo depois de receber. Só muda o que já foi pago.
          </p>
        ) : null}
        {(kids ?? []).length === 0 ? (
          <div className="rounded-3xl bg-white p-6">
            <KidsMascot
              size="lg"
              caption={`Cadastre um filho para ver ${isAllowanceMoney(reward) ? "a mesada" : "os pontos"}.`}
            />
          </div>
        ) : (
          <KidsScoreboard
            kids={kids ?? []}
            scores={scores ?? []}
            pendingByChild={pendingByChild}
            paidByChild={paidByChild(payouts)}
            size="large"
            reward={reward}
            currentKidId={childId}
          />
        )}
        <KidsRallyNudge kids={kids ?? []} scores={scores ?? []} currentKidId={childId} reward={reward} />
      </section>
      {reward?.reward_note ? (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold sm:text-xl">Combinado da família</h2>
          <p className="rounded-3xl bg-white p-5 font-extrabold text-navy/70 ring-2 ring-navy/5">
            {reward.reward_note}
          </p>
        </section>
      ) : null}
    </div>
  );
}
