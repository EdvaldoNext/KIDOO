import Link from "next/link";
import { formatRewardAmount, isAllowanceMoney, monthBalanceLabel, type FamilyReward } from "@/lib/rewards";

type Kid = { id: string; display_name: string };
type Score = { child_id: string; credits: number; debits: number; balance: number };

export function KidsScoreboard({
  kids,
  scores,
  pendingByChild,
  size = "compact",
  reward = null,
  hrefForKid,
  currentKidId,
}: {
  kids: Kid[];
  scores: Score[];
  pendingByChild?: Record<string, number>;
  size?: "compact" | "large";
  reward?: FamilyReward | null;
  hrefForKid?: (kidId: string) => string;
  currentKidId?: string | null;
}) {
  if (kids.length === 0) return null;

  const large = size === "large";
  const columns =
    kids.length === 1 ? "grid-cols-1" : kids.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <section aria-label={isAllowanceMoney(reward) ? "Ganhos de cada filho" : "Pontos de cada filho"}>
      <div className={`grid min-w-0 gap-2 sm:gap-3 ${columns}`}>
        {kids.map((kid) => {
          const score = scores.find((s) => s.child_id === kid.id);
          const pending = pendingByChild?.[kid.id] ?? 0;
          return (
            <Link
              key={kid.id}
              href={hrefForKid?.(kid.id) ?? "/app/kids/pontos"}
              className={`block min-w-0 rounded-2xl bg-gold text-navy ring-1 ring-navy/10 ${
                large ? "p-3 sm:p-6" : "p-2.5 sm:p-4"
              }`}
            >
              <p className={`truncate font-extrabold capitalize ${large ? "text-sm sm:text-xl" : "text-xs sm:text-sm"}`}>
                {kid.display_name}
                {currentKidId === kid.id ? " · você" : ""}
              </p>
              <p
                className={`mt-1 font-extrabold leading-none sm:mt-2 ${
                  large ? "text-2xl sm:text-5xl" : "text-lg sm:text-3xl"
                }`}
              >
                {formatRewardAmount(score?.balance ?? 0, reward)}
              </p>
              <p className={`mt-1 leading-tight font-bold ${large ? "text-[11px] sm:text-base" : "text-[10px] sm:text-sm"}`}>
                {monthBalanceLabel(reward)}
              </p>
              {large ? (
                <p className="mt-1 text-[11px] font-semibold leading-tight sm:mt-2 sm:text-base">
                  Ganhou {formatRewardAmount(score?.credits ?? 0, reward)} · perdeu{" "}
                  {formatRewardAmount(Math.abs(score?.debits ?? 0), reward)}
                </p>
              ) : null}
              {pending > 0 ? (
                <p className="mt-1 truncate text-[10px] font-semibold text-navy/70 sm:text-sm">
                  +{formatRewardAmount(pending, reward)} em aberto
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
