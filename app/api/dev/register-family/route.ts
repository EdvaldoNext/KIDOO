import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { DEV_FAMILY_COOKIE } from "@/lib/app-context";
import { DEV_BYPASS_AUTH } from "@/lib/config";
import { generateKidsAccessKey } from "@/lib/kids-access";

function alreadyExists(error: { message?: string; code?: string } | null) {
  const message = (error?.message ?? "").toLowerCase();
  const code = (error?.code ?? "").toLowerCase();
  return (
    code.includes("exist") ||
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists") ||
    message.includes("duplicate")
  );
}

async function findUserByEmail(
  admin: ReturnType<typeof createServiceClient>,
  email: string,
) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) {
    throw new Error(listed.error.message);
  }
  return listed.data.users.find((user) => user.email?.toLowerCase() === email) ?? null;
}

function withFamilyCookie(familyId: string) {
  const response = NextResponse.json({ ok: true, family_id: familyId });
  response.cookies.set(DEV_FAMILY_COOKIE, familyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}

export async function GET() {
  return NextResponse.json({ devBypass: DEV_BYPASS_AUTH });
}

export async function POST(request: Request) {
  if (!DEV_BYPASS_AUTH) {
    return NextResponse.json({ error: "Modo dev desativado." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      display_name?: string;
      family_name?: string;
      email?: string;
      password?: string;
    };

    const displayName = (body.display_name ?? "").trim();
    const familyName = (body.family_name ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (!displayName || familyName.length < 2 || !email || password.length < 8) {
      return NextResponse.json({ error: "Preencha todos os campos corretamente." }, { status: 400 });
    }

    const admin = createServiceClient();
    let existing = await findUserByEmail(admin, email);
    let userId = existing?.id ?? null;

    if (!userId) {
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
        app_metadata: { role: "owner", platform_admin: false },
      });

      if (created.error) {
        if (!alreadyExists(created.error)) {
          return NextResponse.json({ error: created.error.message }, { status: 400 });
        }
        existing = await findUserByEmail(admin, email);
        userId = existing?.id ?? null;
      } else {
        userId = created.data.user?.id ?? null;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Não foi possível criar ou localizar o usuário." }, { status: 500 });
    }

    const updated = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (updated.error) {
      console.error("dev register update user", updated.error.message);
    }

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("family_id")
      .eq("id", userId)
      .maybeSingle();

    let familyId = existingProfile?.family_id ?? null;

    if (!familyId) {
      const { data: family, error: familyError } = await admin
        .from("families")
        .insert({
          name: familyName,
          lgpd_accepted_at: new Date().toISOString(),
          kids_access_key: generateKidsAccessKey(),
        })
        .select("id")
        .single();

      if (familyError || !family) {
        return NextResponse.json({ error: familyError?.message ?? "Falha ao criar família." }, { status: 400 });
      }

      familyId = family.id;

      const { error: profileError } = await admin.from("profiles").insert({
        id: userId,
        family_id: familyId,
        role: "owner",
        display_name: displayName,
      });

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }
    }

    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role: "owner", family_id: familyId, platform_admin: false },
    });

    return withFamilyCookie(familyId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado no cadastro de teste.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
