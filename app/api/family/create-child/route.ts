import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { isParentRole, type AgeGroup } from "@/lib/auth";
import { ensureKidsAccessKey } from "@/lib/kids-access";

function randomPassword() {
  return crypto.randomUUID() + crypto.randomUUID();
}

export async function POST(request: Request) {
  let familyId: string | undefined;
  let parentId: string | undefined;

  if (DEV_BYPASS_AUTH) {
    const cookieStore = await cookies();
    familyId = cookieStore.get(DEV_FAMILY_COOKIE)?.value;

    if (!familyId) {
      const admin = createServiceClient();
      const { data } = await admin
        .from("families")
        .select("id")
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      familyId = data?.id;
    }

    if (!familyId) {
      return NextResponse.json({ error: "Crie uma família em /cadastro primeiro." }, { status: 400 });
    }

    const admin = createServiceClient();
    const { data: owner } = await admin
      .from("profiles")
      .select("id")
      .eq("family_id", familyId)
      .in("role", ["owner", "parent"])
      .limit(1)
      .maybeSingle();
    parentId = owner?.id;
  } else {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const role = claimsData?.claims?.app_metadata?.role;
    familyId = claimsData?.claims?.app_metadata?.family_id as string | undefined;
    parentId = claimsData?.claims?.sub as string | undefined;

    if (!parentId || !familyId || !isParentRole(role)) {
      return NextResponse.json({ error: "Só pais podem adicionar filhos." }, { status: 403 });
    }
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
      const maxChildren = limits?.[family?.plan ?? "free"]?.children;
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
      { error: "Configure SUPABASE_SERVICE_ROLE_KEY no servidor para criar filhos." },
      { status: 500 },
    );
  }
}
