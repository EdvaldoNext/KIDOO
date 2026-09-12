import { NextResponse } from "next/server";
import { allowanceSnapshot, fromCents, moneyCents } from "@/lib/allowance";
import { currentScorePeriod } from "@/lib/dates";
import { requireParentActor } from "@/lib/parent-family";
import { isAllowanceMoney, type FamilyReward } from "@/lib/rewards";
import { createServiceClient } from "@/utils/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function loadMonthContext(familyId: string, childId: string) {
  const admin = createServiceClient();
  const { year, month } = currentScorePeriod();

  const [childResult, scoreResult, payoutsResult, familyResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name")
      .eq("id", childId)
      .eq("family_id", familyId)
      .eq("role", "child")
      .maybeSingle(),
    admin
      .from("monthly_scores")
      .select("balance")
      .eq("family_id", familyId)
      .eq("child_id", childId)
      .eq("year", year)
      .eq("month", month)
      .maybeSingle(),
    admin
      .from("allowance_payouts")
      .select("id, amount, created_at")
      .eq("family_id", familyId)
      .eq("child_id", childId)
      .eq("year", year)
      .eq("month", month)
      .order("created_at", { ascending: false }),
    admin.from("families").select("reward_mode, currency_amount").eq("id", familyId).maybeSingle(),
  ]);

  return {
    admin,
    year,
    month,
    child: childResult.data,
    score: scoreResult.data,
    payouts: payoutsResult.data ?? [],
    reward: familyResult.data as FamilyReward | null,
  };
}

export async function POST(request: Request) {
  const actor = await requireParentActor();
  if (!actor) {
    return NextResponse.json({ error: "Só pais podem dar baixa na mesada." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { child_id?: unknown; amount?: unknown } | null;
  const childId = typeof body?.child_id === "string" ? body.child_id : "";
  if (!UUID_RE.test(childId)) {
    return NextResponse.json({ error: "Escolha um filho para dar baixa." }, { status: 400 });
  }

  try {
    const { admin, year, month, child, score, payouts, reward } = await loadMonthContext(actor.familyId, childId);
    if (!child) {
      return NextResponse.json({ error: "Filho não encontrado nesta família." }, { status: 404 });
    }
    if (!isAllowanceMoney(reward)) {
      return NextResponse.json({ error: "A família não está no combinado de mesada." }, { status: 400 });
    }

    const paid = payouts.reduce((sum, row) => sum + moneyCents(row.amount), 0);
    const snapshot = allowanceSnapshot(Number(score?.balance ?? 0), fromCents(paid), reward);
    if (snapshot.dueCents <= 0) {
      return NextResponse.json({ error: "Nada a pagar agora. O total do mês já está em dia." }, { status: 400 });
    }

    const requestedCents = body?.amount == null ? snapshot.dueCents : moneyCents(body.amount);
    if (requestedCents <= 0) {
      return NextResponse.json({ error: "Informe um valor maior que zero." }, { status: 400 });
    }

    const amountCents = Math.min(requestedCents, snapshot.dueCents);
    const amount = fromCents(amountCents);

    const { error } = await admin.from("allowance_payouts").insert({
      family_id: actor.familyId,
      child_id: childId,
      year,
      month,
      amount,
      paid_by: actor.parentId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, amount });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar o pagamento." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const actor = await requireParentActor();
  if (!actor) {
    return NextResponse.json({ error: "Só pais podem desfazer a baixa da mesada." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { child_id?: unknown } | null;
  const childId = typeof body?.child_id === "string" ? body.child_id : "";
  if (!UUID_RE.test(childId)) {
    return NextResponse.json({ error: "Escolha um filho para desfazer o pagamento." }, { status: 400 });
  }

  try {
    const { admin, child, payouts } = await loadMonthContext(actor.familyId, childId);
    if (!child) {
      return NextResponse.json({ error: "Filho não encontrado nesta família." }, { status: 404 });
    }

    const last = payouts[0];
    if (!last) {
      return NextResponse.json({ error: "Não há pagamento deste mês para desfazer." }, { status: 400 });
    }

    const { error } = await admin
      .from("allowance_payouts")
      .delete()
      .eq("id", last.id)
      .eq("family_id", actor.familyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, amount: Number(last.amount) });
  } catch {
    return NextResponse.json({ error: "Não foi possível desfazer o pagamento." }, { status: 500 });
  }
}
