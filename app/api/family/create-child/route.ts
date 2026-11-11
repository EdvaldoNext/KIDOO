import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/backend/admin";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { type AgeGroup } from "@/lib/auth";
import { ensureKidsAccessKey } from "@/lib/kids-access";
import { requireParentActor } from "@/lib/parent-family";

const PRIETO_OWNER_EMAIL = "edvaldomil@gmail.com";
const PRIETO_CHILD_LIMIT = 10;

function randomPassword() {
  return crypto.randomUUID() + crypto.randomUUID();
}

async function maxChildrenForFamily(
  admin: ReturnType<typeof createServiceClient>,
  familyId: string,
  plan: string | null | undefined,
  planLimits: Record<string, { children: number | null }> | undefined,
) {
  const { data: owner } = await admin
    .from("profiles")
    .select("id")
    .eq("family_id", familyId)
    .eq("role", "owner")
    .maybeSingle();

  if (owner?.id) {
    const { data } = await admin.auth.admin.getUserById(owner.id);
    if (data.user?.email?.toLowerCase() === PRIETO_OWNER_EMAIL) return PRIETO_CHILD_LIMIT;
  }

  return planLimits?.[plan ?? "free"]?.children;
}

export async function POST(request: Request) {
  const actor = await requireParentActor();
  const familyId = actor?.familyId;

  if (!familyId) {
    return NextResponse.json(
      { error: DEV_BYPASS_AUTH ? "Crie uma família em /cadastro primeiro." : "Só pais podem adicionar filhos." },
      { status: DEV_BYPASS_AUTH ? 400 : 403 },
    );
  }

  const body = (await request.json()) as {
    display_name?: string;
    age_group?: AgeGroup;
  };
  const displayName = (body.display_name ?? "").trim();
  const ageGroup = body.age_group;

  if (!displayName || !ageGroup) {
    return NextResponse.json({ error: "Preencha nome e faixa etária." }, { status: 400 });
  }

  try {
    const admin = createServiceClient();

    if (!DEV_BYPASS_AUTH) {
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("family_id", familyId)
        .eq("role", "child");

      const { data: family } = await admin
        .from("families")
        .select("plan")
        .eq("id", familyId)
        .single();
      const { data: settings } = await admin
        .from("platform_settings")
        .select("plan_limits")
        .eq("id", 1)
        .single();

      const limits = settings?.plan_limits as Record<string, { children: number | null }> | undefined;
      const maxChildren = await maxChildrenForFamily(admin, familyId, family?.plan, limits);
      if (typeof maxChildren === "number" && (count ?? 0) >= maxChildren) {
        return NextResponse.json({ error: "Limite de filhos do plano atingido." }, { status: 400 });
      }
    }

    if (!familyId) {
      return NextResponse.json({ error: "Família não encontrada." }, { status: 400 });
    }

    const kidsAccessKey = await ensureKidsAccessKey(admin, familyId);
    const password = randomPassword();
    const email = `child.${crypto.randomUUID()}@users.kidoo.internal`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        role: "child",
        family_id: familyId,
        platform_admin: false,
      },
      user_metadata: { display_name: displayName },
    });

    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message ?? "Falha ao criar conta." }, { status: 400 });
    }

    const newId = created.user.id;

    const { error: profileError } = await admin.from("profiles").insert({
      id: newId,
      family_id: familyId,
      role: "child",
      display_name: displayName,
      age_group: ageGroup,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(newId);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      child: {
        id: newId,
        display_name: displayName,
        age_group: ageGroup,
      },
      kids_access_key: kidsAccessKey,
    });
  } catch {
    return NextResponse.json(
      { error: "Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no servidor para criar filhos." },
      { status: 500 },
    );
  }
}
