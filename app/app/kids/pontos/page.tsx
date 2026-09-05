import { getAppContext } from "@/lib/app-context";
import { KidsScoreboard } from "@/components/kids/KidsScoreboard";
import { isAllowanceMoney, kidsPointsTitle, loadFamilyReward } from "@/lib/rewards";

export default async function KidsPointsPage() {
  const { supabase, familyId, childId, devMode } = await getAppContext();
  const now = new Date();

  let scoresQuery = supabase
    .from("monthly_scores")
    .select("child_id, credits, debits, balance")
    .eq("year", now.getFullYear())
    .eq("month", now.getMonth() + 1);

  let childrenQuery = supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "child")
    .order("created_at", { ascending: true });

  let tasksQuery = supabase
    .from("tasks")
    .select("assigned_child_id, weight, kind")
    .in("status", ["pending", "awaiting_approval"]);

  if (familyId) {
    scoresQuery = scoresQuery.eq("family_id", familyId);
    childrenQuery = childrenQuery.eq("family_id", familyId);
    tasksQuery = tasksQuery.eq("family_id", familyId);
  }

  const [{ data: scores }, { data: kids }, { data: tasks }, reward] = await Promise.all([
    scoresQuery,
    childrenQuery,
    tasksQuery,
    loadFamilyReward(supabase, familyId),
  ]);

  const pendingByChild: Record<string, number> = {};
  for (const task of tasks ?? []) {
    if (task.kind !== "points") continue;
    pendingByChild[task.assigned_child_id] = (pendingByChild[task.assigned_child_id] ?? 0) + (task.weight ?? 0);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold sm:text-xl">{kidsPointsTitle(reward, devMode)}</h2>
        {(kids ?? []).length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center font-bold text-navy/70">
            Cadastre um filho para ver {isAllowanceMoney(reward) ? "a mesada" : "os pontos"}.
          </p>
        ) : (
          <KidsScoreboard
            kids={kids ?? []}
            scores={scores ?? []}
            pendingByChild={pendingByChild}
            size="large"
            reward={reward}
            currentKidId={childId}
          />
        )}
      </section>
      {reward?.reward_note ? (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold sm:text-xl">Combinado da família</h2>
          <p className="rounded-2xl bg-white p-5 font-bold text-navy/70 ring-1 ring-navy/5">{reward.reward_note}</p>
        </section>
      ) : null}
    </div>
  );
}
