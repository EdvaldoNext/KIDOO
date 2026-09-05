import type { SupabaseClient } from "@supabase/supabase-js";

export type RewardMode = "points" | "symbolic" | "allowance";

export type FamilyReward = {
  reward_mode: RewardMode;
  currency_amount: number | null;
  reward_note?: string | null;
};

export function parseMoneyInput(raw: unknown) {
  const value = String(raw ?? "").trim().replace(/\s/g, "");
  if (!value) return null;

  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  let normalized = value;

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? value.replace(/\./g, "").replace(",", ".")
        : value.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = value.replace(",", ".");
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

export function formatMoneyInput(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "";
  return String(value).replace(".", ",");
}

export function isAllowanceMoney(reward: FamilyReward | null | undefined) {
  return reward?.reward_mode === "allowance" && Number(reward.currency_amount) > 0;
}

export function toReais(points: number, reward: FamilyReward | null | undefined) {
  if (!isAllowanceMoney(reward)) return points;
  return points * Number(reward.currency_amount);
}

export function formatMoney(value: number) {
  const rounded = Math.round(value * 100) / 100;
  const cents = Math.round(rounded * 100);
  return rounded.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function formatRewardAmount(points: number, reward: FamilyReward | null | undefined) {
  if (isAllowanceMoney(reward)) {
    return formatMoney(toReais(points, reward));
  }
  return String(points);
}

export function formatRewardAmountWithUnit(points: number, reward: FamilyReward | null | undefined) {
  if (isAllowanceMoney(reward)) {
    return formatMoney(toReais(points, reward));
  }
  return `${points} ${points === 1 ? "ponto" : "pontos"}`;
}

export function monthBalanceLabel(reward: FamilyReward | null | undefined) {
  return isAllowanceMoney(reward) ? "ganhos do mês" : "pontos do mês";
}

export function kidsPointsTitle(reward: FamilyReward | null | undefined, devMode: boolean) {
  if (isAllowanceMoney(reward)) {
    return devMode ? "Mesada dos filhos" : "Minha mesada";
  }
  return devMode ? "Pontos dos filhos" : "Meus pontos";
}

export function kidsPointsNavLabel(reward: FamilyReward | null | undefined) {
  return isAllowanceMoney(reward) ? "Mesada" : "Pontos";
}

export async function loadFamilyReward(supabase: SupabaseClient, familyId: string | null) {
  let query = supabase.from("families").select("reward_mode, currency_amount, reward_note");
  query = familyId ? query.eq("id", familyId).limit(1) : query.limit(1);
  const { data } = await query.maybeSingle();
  return data as FamilyReward | null;
}
