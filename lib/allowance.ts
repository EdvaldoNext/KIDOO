import { formatMoney, isAllowanceMoney, toReais, type FamilyReward } from "@/lib/rewards";

export type AllowancePayoutRow = {
  child_id: string;
  amount: number | string;
};

export type AllowanceSnapshot = {
  total: number;
  paid: number;
  due: number;
  totalCents: number;
  paidCents: number;
  dueCents: number;
  settled: boolean;
  hasEarnings: boolean;
  hasPaid: boolean;
  paidRatio: number;
};

export function moneyCents(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function fromCents(cents: number) {
  return cents / 100;
}

export function paidByChild(payouts: AllowancePayoutRow[] | null | undefined) {
  const totals: Record<string, number> = {};
  for (const row of payouts ?? []) {
    totals[row.child_id] = (totals[row.child_id] ?? 0) + fromCents(moneyCents(row.amount));
  }
  return totals;
}

export function sumPaid(payouts: AllowancePayoutRow[] | null | undefined) {
  return fromCents((payouts ?? []).reduce((sum, row) => sum + moneyCents(row.amount), 0));
}

export function allowanceSnapshot(
  points: number,
  paidReais: number,
  reward: FamilyReward | null | undefined,
): AllowanceSnapshot {
  const totalCents = isAllowanceMoney(reward) ? moneyCents(toReais(points, reward)) : 0;
  const paidCents = Math.max(0, moneyCents(paidReais));
  const dueCents = Math.max(0, totalCents - paidCents);
  return {
    total: fromCents(totalCents),
    paid: fromCents(paidCents),
    due: fromCents(dueCents),
    totalCents,
    paidCents,
    dueCents,
    settled: dueCents === 0 && paidCents > 0,
    hasEarnings: totalCents > 0,
    hasPaid: paidCents > 0,
    paidRatio: totalCents > 0 ? Math.min(1, paidCents / totalCents) : paidCents > 0 ? 1 : 0,
  };
}

export function formatAllowanceMoney(value: number) {
  return formatMoney(fromCents(moneyCents(value)));
}
