import Link from "next/link";
import { getAppContext } from "@/lib/app-context";
import { ParentPageHeader, ParentTrustStrip } from "@/components/family/ParentPageHeader";
import { KidAvatar } from "@/components/kids/KidAvatar";
import { prettyName } from "@/lib/names";
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
  const kids = children ?? [];

  return (
    <div className="space-y-5">
      <ParentPageHeader
        eyebrow="Combinado do mês"
        title={money ? "Mesada do mês" : "Pontos do mês"}
        subtitle={
          kids.length === 0
            ? "Cadastre um filho para acompanhar o combinado."
            : money
              ? "O valor que cada um acumulou neste mês."
              : "Os pontos de cada um neste mês."
        }
        action={
          <Link href="/app/configuracoes" className="text-sm font-bold text-royal hover:underline">
            Mudar combinado
          </Link>
        }
      />
      <ParentTrustStrip
        aside={money ? `Cada ponto vale ${formatMoney(Number(reward?.currency_amount))}.` : undefined}
      >
        Isso é o combinado da casa, não um ranking para comparar irmãos.
      </ParentTrustStrip>
      {kids.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-navy/5">
          <p className="font-bold">Nenhuma criança cadastrada.</p>
          <Link href="/app/filhos" className="mt-4 inline-block rounded-xl bg-royal px-4 py-2 font-bold text-white">
            Cadastrar filho
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {kids.map((child) => {
            const score = (scores ?? []).find((s) => s.child_id === child.id);
            const balance = score?.balance ?? 0;
            const name = prettyName(child.display_name);
            return (
              <div key={child.id} className="flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-navy/5">
                <span aria-hidden>
                  <KidAvatar name={name} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">{name}</p>
                  <p className="mt-1 text-3xl font-extrabold text-royal">
                    {money ? formatRewardAmount(balance, reward) : `${balance} pts`}
                  </p>
                  <p className="text-sm text-navy/60">
                    {money ? `${balance} pts · ` : ""}+{score?.credits ?? 0} ganhos · {score?.debits ?? 0} saídas
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {reward?.reward_note ? (
        <p className="rounded-2xl bg-gold/15 px-4 py-3 text-sm font-semibold text-navy">
          Combinado extra: {reward.reward_note}
        </p>
      ) : null}
    </div>
  );
}
