import Link from "next/link";
import { AllowanceStatus } from "@/components/family/AllowanceStatus";
import { KidAvatar } from "@/components/kids/KidAvatar";
import { allowanceSnapshot } from "@/lib/allowance";
import { formatRewardAmount, isAllowanceMoney, monthBalanceLabel, type FamilyReward } from "@/lib/rewards";

type Kid = { id: string; display_name: string };
type Score = { child_id: string; credits: number; debits: number; balance: number };

export function KidsScoreboard({
  kids,
  scores,
  pendingByChild,
  paidByChild,
  size = "compact",
  reward = null,
  hrefForKid,
  currentKidId,
}: {
  kids: Kid[];
  scores: Score[];
  pendingByChild?: Record<string, number>;
  paidByChild?: Record<string, number>;
  size?: "compact" | "large";
  reward?: FamilyReward | null;
  hrefForKid?: (kidId: string) => string;
  currentKidId?: string | null;
}) {
  if (kids.length === 0) return null;

  const large = size === "large";
  const money = isAllowanceMoney(reward);
  const columns =
    kids.length === 1 ? "grid-cols-1" : kids.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3";

  return (
    <section aria-label={money ? "Mesada de cada filho" : "Pontos de cada filho"}>
      <div className={`grid min-w-0 gap-2 sm:gap-3 ${columns}`}>
        {kids.map((kid) => {
          const score = scores.find((s) => s.child_id === kid.id);
          const pending = pendingByChild?.[kid.id] ?? 0;
          const isYou = currentKidId === kid.id;
          const snapshot = money ? allowanceSnapshot(score?.balance ?? 0, paidByChild?.[kid.id] ?? 0, reward) : null;
          return (
            <Link
              key={kid.id}
              href={hrefForKid?.(kid.id) ?? "/app/kids/pontos"}
              className={`kids-pop block min-w-0 rounded-3xl text-navy ring-2 ${
                isYou ? "bg-gold ring-navy/20" : "bg-white ring-navy/10"
              } ${large ? "p-3 sm:p-5" : "p-2.5 sm:p-4"}`}
            >
              <div className="flex items-center gap-2">
                <KidAvatar name={kid.display_name} size="sm" className={isYou ? "ring-2 ring-navy/20" : ""} />
                <p className={`min-w-0 truncate font-extrabold capitalize ${large ? "text-sm sm:text-lg" : "text-xs sm:text-sm"}`}>
                  {kid.display_name}
                  {isYou ? " · você" : ""}
                </p>
              </div>
              <p
                className={`mt-2 font-extrabold leading-none ${
                  large ? "text-2xl sm:text-4xl" : "text-lg sm:text-3xl"
                }`}
              >
                {formatRewardAmount(score?.balance ?? 0, reward)}
              </p>
              <p className={`mt-1 leading-tight font-bold ${large ? "text-[11px] sm:text-base" : "text-[10px] sm:text-sm"}`}>
                {monthBalanceLabel(reward)}
              </p>
              {snapshot ? <AllowanceStatus snapshot={snapshot} voice="child" size={large ? "large" : "compact"} /> : null}
              {large && !money ? (
                <p className="mt-1 text-[11px] font-semibold leading-tight sm:mt-2 sm:text-base">
                  Ganhou {formatRewardAmount(score?.credits ?? 0, reward)} · perdeu{" "}
                  {formatRewardAmount(Math.abs(score?.debits ?? 0), reward)}
                </p>
              ) : null}
              {pending > 0 ? (
                <p className="mt-1 truncate text-[10px] font-extrabold text-royal sm:text-sm">
                  +{formatRewardAmount(pending, reward)} se fizer as missões
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
