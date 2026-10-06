import { monthName } from "@/lib/dates";
import { formatMoney, isAllowanceMoney, toReais, type FamilyReward } from "@/lib/rewards";

export type AllowancePayoutRow = {
  child_id: string;
  amount: number | string;
  year?: number;
  month?: number;
};

export type AllowanceMonthRow = {
  year: number;
  month: number;
  balance: number | string;
};

export type AllowancePayoutMonthRow = {
  year: number;
  month: number;
  amount: number | string;
};

export type OpenAllowanceMonth = {
  year: number;
  month: number;
  earnedCents: number;
  paidCents: number;
  dueCents: number;
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
  canUndo: boolean;
  paidRatio: number;
  carriedCents: number;
  carriedNote: string | null;
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
    canUndo: paidCents > 0,
    paidRatio: totalCents > 0 ? Math.min(1, paidCents / totalCents) : paidCents > 0 ? 1 : 0,
    carriedCents: 0,
    carriedNote: null,
  };
}

function periodIndex(year: number, month: number) {
  return year * 12 + month;
}

/** Junta ganhos e pagamentos de cada mês. O que sobrou fica em dueCents. */
export function openAllowanceMonths(
  scores: AllowanceMonthRow[] | null | undefined,
  payouts: AllowancePayoutMonthRow[] | null | undefined,
  reward: FamilyReward | null | undefined,
): OpenAllowanceMonth[] {
  const byPeriod = new Map<number, OpenAllowanceMonth>();

  for (const score of scores ?? []) {
    const key = periodIndex(score.year, score.month);
    const current = byPeriod.get(key) ?? {
      year: score.year,
      month: score.month,
      earnedCents: 0,
      paidCents: 0,
      dueCents: 0,
    };
    const earned = isAllowanceMoney(reward) ? moneyCents(toReais(Number(score.balance ?? 0), reward)) : 0;
    current.earnedCents += earned;
    byPeriod.set(key, current);
  }

  for (const payout of payouts ?? []) {
    const key = periodIndex(payout.year, payout.month);
    const current = byPeriod.get(key) ?? {
      year: payout.year,
      month: payout.month,
      earnedCents: 0,
      paidCents: 0,
      dueCents: 0,
    };
    current.paidCents += Math.max(0, moneyCents(payout.amount));
    byPeriod.set(key, current);
  }

  return [...byPeriod.values()]
    .map((row) => ({ ...row, dueCents: Math.max(0, row.earnedCents - row.paidCents) }))
    .sort((a, b) => periodIndex(a.year, a.month) - periodIndex(b.year, b.month));
}

function otherDueMonths(months: OpenAllowanceMonth[], period: { year: number; month: number }) {
  const current = periodIndex(period.year, period.month);
  return months.filter((row) => periodIndex(row.year, row.month) !== current && row.dueCents > 0);
}

function describeCarried(others: OpenAllowanceMonth[]) {
  const carriedCents = others.reduce((sum, row) => sum + row.dueCents, 0);
  if (carriedCents <= 0) return { carriedCents: 0, carriedNote: null as string | null };
  const amount = formatAllowanceMoney(fromCents(carriedCents));
  const carriedNote =
    others.length === 1
      ? `Inclui ${amount} de ${monthName(others[0].year, others[0].month)}`
      : `Inclui ${amount} de outros meses`;
  return { carriedCents, carriedNote };
}

/** Ganhos e pagos do mês atual. "Ainda falta" soma o que ficou aberto em qualquer mês. */
export function allowanceSnapshotFromMonths(
  months: OpenAllowanceMonth[],
  period: { year: number; month: number },
  canUndo = false,
): AllowanceSnapshot {
  const current = months.find((row) => row.year === period.year && row.month === period.month);
  const totalCents = current?.earnedCents ?? 0;
  const paidCents = current?.paidCents ?? 0;
  const dueCents = months.reduce((sum, row) => sum + row.dueCents, 0);
  const carried = describeCarried(otherDueMonths(months, period));
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
    canUndo,
    paidRatio: totalCents > 0 ? Math.min(1, paidCents / totalCents) : paidCents > 0 ? 1 : 0,
    carriedCents: carried.carriedCents,
    carriedNote: carried.carriedNote,
  };
}

export function childAllowanceSnapshot(
  childId: string,
  scores: Array<AllowanceMonthRow & { child_id: string }> | null | undefined,
  payouts: Array<AllowancePayoutMonthRow & { child_id: string }> | null | undefined,
  reward: FamilyReward | null | undefined,
  period: { year: number; month: number },
): AllowanceSnapshot {
  const childScores = (scores ?? []).filter((row) => row.child_id === childId);
  const childPayouts = (payouts ?? []).filter((row) => row.child_id === childId);
  return allowanceSnapshotFromMonths(
    openAllowanceMonths(childScores, childPayouts, reward),
    period,
    childPayouts.length > 0,
  );
}

/** Soma a dívida de cada criança. Um pagamento a mais de um filho não abate o outro. */
export function familyAllowanceSnapshot(
  scores: Array<AllowanceMonthRow & { child_id: string }> | null | undefined,
  payouts: Array<AllowancePayoutMonthRow & { child_id: string }> | null | undefined,
  reward: FamilyReward | null | undefined,
  period: { year: number; month: number },
): AllowanceSnapshot {
  const childIds = [
    ...new Set([...(scores ?? []).map((row) => row.child_id), ...(payouts ?? []).map((row) => row.child_id)]),
  ];
  const snapshots = childIds.map((childId) => childAllowanceSnapshot(childId, scores, payouts, reward, period));
  const dueCents = snapshots.reduce((sum, row) => sum + row.dueCents, 0);
  const paidCents = snapshots.reduce((sum, row) => sum + row.paidCents, 0);
  const totalCents = snapshots.reduce((sum, row) => sum + row.totalCents, 0);

  const others = new Map<number, OpenAllowanceMonth>();
  for (const childId of childIds) {
    const months = openAllowanceMonths(
      (scores ?? []).filter((row) => row.child_id === childId),
      (payouts ?? []).filter((row) => row.child_id === childId),
      reward,
    );
    for (const month of otherDueMonths(months, period)) {
      const key = periodIndex(month.year, month.month);
      const current = others.get(key) ?? { ...month, dueCents: 0 };
      current.dueCents += month.dueCents;
      others.set(key, current);
    }
  }
  const carried = describeCarried([...others.values()]);

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
    canUndo: (payouts ?? []).length > 0,
    paidRatio: totalCents > 0 ? Math.min(1, paidCents / totalCents) : paidCents > 0 ? 1 : 0,
    carriedCents: carried.carriedCents,
    carriedNote: carried.carriedNote,
  };
}

/** Reparte o pagamento começando pelo mês em aberto mais antigo. */
export function allocatePayout(months: OpenAllowanceMonth[], amountCents: number) {
  let left = Math.max(0, amountCents);
  const parts: Array<{ year: number; month: number; amountCents: number }> = [];
  for (const month of months) {
    if (left <= 0) break;
    if (month.dueCents <= 0) continue;
    const take = Math.min(left, month.dueCents);
    parts.push({ year: month.year, month: month.month, amountCents: take });
    left -= take;
  }
  return parts;
}

export function formatAllowanceMoney(value: number) {
  return formatMoney(fromCents(moneyCents(value)));
}
