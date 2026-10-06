import { NextResponse } from "next/server";
import {
  allocatePayout,
  allowanceSnapshotFromMonths,
  fromCents,
  moneyCents,
  openAllowanceMonths,
} from "@/lib/allowance";
import { currentScorePeriod } from "@/lib/dates";
import { requireParentActor } from "@/lib/parent-family";
import { isAllowanceMoney, type FamilyReward } from "@/lib/rewards";
import { createServiceClient } from "@/utils/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function loadAllowanceContext(familyId: string, childId: string) {
  const admin = createServiceClient();
  const period = currentScorePeriod();

  const [childResult, scoresResult, payoutsResult, familyResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name")
      .eq("id", childId)
      .eq("family_id", familyId)
      .eq("role", "child")
      .maybeSingle(),
    admin
      .from("monthly_scores")
      .select("year, month, balance")
      .eq("family_id", familyId)
      .eq("child_id", childId),
    admin
      .from("allowance_payouts")
      .select("id, amount, year, month, created_at")
      .eq("family_id", familyId)
      .eq("child_id", childId)
      .order("created_at", { ascending: false }),
    admin.from("families").select("reward_mode, currency_amount").eq("id", familyId).maybeSingle(),
  ]);

  const reward = familyResult.data as FamilyReward | null;
  const scores = scoresResult.data ?? [];
  const payouts = payoutsResult.data ?? [];
  const months = openAllowanceMonths(scores, payouts, reward);

  return {
    admin,
    child: childResult.data,
    payouts,
    reward,
    months,
    snapshot: allowanceSnapshotFromMonths(months, period, payouts.length > 0),
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
    const { admin, child, months, snapshot, reward } = await loadAllowanceContext(actor.familyId, childId);
    if (!child) {
      return NextResponse.json({ error: "Filho não encontrado nesta família." }, { status: 404 });
    }
    if (!isAllowanceMoney(reward)) {
      return NextResponse.json({ error: "A família não está no combinado de mesada." }, { status: 400 });
    }

    if (snapshot.dueCents <= 0) {
      return NextResponse.json({ error: "Nada a pagar agora. A mesada já está em dia." }, { status: 400 });
    }

    const requestedCents = body?.amount == null ? snapshot.dueCents : moneyCents(body.amount);
    if (requestedCents <= 0) {
      return NextResponse.json({ error: "Informe um valor maior que zero." }, { status: 400 });
    }

    const amountCents = Math.min(requestedCents, snapshot.dueCents);
    const parts = allocatePayout(months, amountCents);
    if (parts.length === 0) {
      return NextResponse.json({ error: "Nada a pagar agora. A mesada já está em dia." }, { status: 400 });
    }

    const amount = fromCents(parts.reduce((sum, part) => sum + part.amountCents, 0));
    const createdAt = new Date().toISOString();

    const { error } = await admin.from("allowance_payouts").insert(
      parts.map((part) => ({
        family_id: actor.familyId,
        child_id: childId,
        year: part.year,
        month: part.month,
        amount: fromCents(part.amountCents),
        paid_by: actor.parentId,
        created_at: createdAt,
      })),
    );

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
    const { admin, child, payouts } = await loadAllowanceContext(actor.familyId, childId);
    if (!child) {
      return NextResponse.json({ error: "Filho não encontrado nesta família." }, { status: 404 });
    }

    const last = payouts[0];
    if (!last) {
      return NextResponse.json({ error: "Não há pagamento para desfazer." }, { status: 400 });
    }

    const batch = payouts.filter((row) => row.created_at === last.created_at);
    const { error } = await admin
      .from("allowance_payouts")
      .delete()
      .in(
        "id",
        batch.map((row) => row.id),
      )
      .eq("family_id", actor.familyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const amount = fromCents(batch.reduce((sum, row) => sum + moneyCents(row.amount), 0));
    return NextResponse.json({ ok: true, amount });
  } catch {
    return NextResponse.json({ error: "Não foi possível desfazer o pagamento." }, { status: 500 });
  }
}
