import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { requireParentFamilyId } from "@/lib/parent-family";
import { type AgeGroup } from "@/lib/auth";

const AGE_GROUPS: AgeGroup[] = ["6_9", "10_13", "14_plus"];

async function loadFamilyChild(childId: string, familyId: string) {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, display_name, age_group, family_id, role")
    .eq("id", childId)
    .eq("family_id", familyId)
    .eq("role", "child")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ childId: string }> },
) {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return NextResponse.json({ error: "Só pais podem editar filhos." }, { status: 403 });
  }

  const { childId } = await params;
  const body = (await request.json()) as {
    display_name?: string;
    age_group?: AgeGroup;
  };
  const displayName = (body.display_name ?? "").trim();
  const ageGroup = body.age_group;

  if (!displayName || displayName.length > 60 || !ageGroup || !AGE_GROUPS.includes(ageGroup)) {
    return NextResponse.json({ error: "Preencha nome e faixa etária." }, { status: 400 });
  }

  try {
    const child = await loadFamilyChild(childId, familyId);
    if (!child) {
      return NextResponse.json({ error: "Filho não encontrado." }, { status: 404 });
    }

    const admin = createServiceClient();
    const { data: updated, error } = await admin
      .from("profiles")
      .update({ display_name: displayName, age_group: ageGroup })
      .eq("id", child.id)
      .select("id, display_name, age_group")
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: error?.message ?? "Não foi possível salvar." }, { status: 400 });
    }

    await admin.auth.admin.updateUserById(child.id, {
      user_metadata: { display_name: displayName },
    });

    return NextResponse.json({ child: updated });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> },
) {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return NextResponse.json({ error: "Só pais podem excluir filhos." }, { status: 403 });
  }

  const { childId } = await params;

  try {
    const child = await loadFamilyChild(childId, familyId);
    if (!child) {
      return NextResponse.json({ error: "Filho não encontrado." }, { status: 404 });
    }

    const admin = createServiceClient();
    const { error } = await admin.auth.admin.deleteUser(child.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir." }, { status: 500 });
  }
}
