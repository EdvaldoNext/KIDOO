import { formatRewardAmountWithUnit, type FamilyReward } from "@/lib/rewards";

type Kid = { id: string; display_name: string };
type Score = { child_id: string; balance: number };

export function KidsRallyNudge({
  kids,
  scores,
  currentKidId,
  reward,
}: {
  kids: Kid[];
  scores: Score[];
  currentKidId: string | null;
  reward: FamilyReward | null;
}) {
  if (!currentKidId || kids.length < 2) return null;

  const rows = kids.map((kid) => ({
    ...kid,
    balance: scores.find((score) => score.child_id === kid.id)?.balance ?? 0,
  }));
  const me = rows.find((kid) => kid.id === currentKidId);
  const leader = rows.reduce((top, kid) => (kid.balance > top.balance ? kid : top));

  if (!me || leader.id === me.id || leader.balance <= me.balance) return null;

  const gap = leader.balance - me.balance;
  return (
    <p className="rounded-3xl bg-royal/10 px-4 py-3 text-center font-extrabold text-royal">
      Faltam {formatRewardAmountWithUnit(gap, reward)} para alcançar {leader.display_name}. Bora!
    </p>
  );
}
