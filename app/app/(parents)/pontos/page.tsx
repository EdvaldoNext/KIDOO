import { getAppContext } from "@/lib/app-context";
import {
  formatMoney,
  formatRewardAmount,
  isAllowanceMoney,
  loadFamilyReward,
} from "@/lib/rewards";

export default async function PointsPage() {
  const { supabase, familyId } = await getAppContext();
  const now = new Date();

  let scoresQuery = supabase
    .from("monthly_scores")
    .select("child_id, credits, debits, balance")
    .eq("year", now.getFullYear())
    .eq("month", now.getMonth() + 1);

  let childrenQuery = supabase.from("profiles").select("id, display_name").eq("role", "child");

  if (familyId) {
    scoresQuery = scoresQuery.eq("family_id", familyId);
    childrenQuery = childrenQuery.eq("family_id", familyId);
  }

  const [{ data: scores }, { data: children }, reward] = await Promise.all([
    scoresQuery,
    childrenQuery,
    loadFamilyReward(supabase, familyId),
  ]);
  const money = isAllowanceMoney(reward);

  const names = new Map((children ?? []).map((c) => [c.id, c.display_name]));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">{money ? "Mesada do mês" : "Pontos do mês"}</h1>
      <div className="grid gap-3">
        {(children ?? []).map((child) => {
          const score = (scores ?? []).find((s) => s.child_id === child.id);
          const balance = score?.balance ?? 0;
          return (
            <div key={child.id} className="rounded-2xl bg-white p-5 ring-1 ring-navy/5">
              <p className="font-bold">{names.get(child.id)}</p>
              <p className="mt-1 text-3xl font-extrabold text-royal">
                {money ? formatRewardAmount(balance, reward) : `${balance} pts`}
              </p>
              <p className="text-sm text-navy/60">
                {money ? `${balance} pts · ` : ""}+{score?.credits ?? 0} · {score?.debits ?? 0}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-navy/70">
        Modo de recompensa: {reward?.reward_mode === "allowance" ? "mesada" : reward?.reward_mode === "symbolic" ? "simbólico" : "pontos"}.
        {money ? ` Cada ponto vale ${formatMoney(Number(reward?.currency_amount))}.` : ""}
        {reward?.reward_note ? ` ${reward.reward_note}` : ""}
      </p>
    </div>
  );
}
