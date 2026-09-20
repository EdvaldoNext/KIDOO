import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { ensureKidsAccessKey, KIDS_ENTRY_PATH } from "@/lib/kids-access";
import { requireParentFamilyId } from "@/lib/parent-family";

export async function GET() {
  const familyId = await requireParentFamilyId();
  if (!familyId) {
    return NextResponse.json({ error: "Só pais podem ver o link dos filhos." }, { status: 403 });
  }

  try {
    const key = await ensureKidsAccessKey(createServiceClient(), familyId);
    return NextResponse.json({ key, path: KIDS_ENTRY_PATH });
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar a chave da família." }, { status: 500 });
  }
}
