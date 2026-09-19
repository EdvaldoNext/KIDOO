import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { attachProfileSession, emailPasswordMatches } from "@/lib/auth-session";
import { isSecureRequest, withDevFamilySession } from "@/lib/dev-cookies";
import { generateKidsAccessKey } from "@/lib/kids-access";
import { ensureParentAccessKey, familyKeysOnCreate } from "@/lib/parent-invite";

function alreadyRegistered(error: { message?: string; code?: string } | null) {
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

async function findUserByEmail(admin: ReturnType<typeof createServiceClient>, email: string) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) {
    throw new Error(listed.error.message);
  }
  return listed.data.users.find((user) => user.email?.toLowerCase() === email) ?? null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    display_name?: unknown;
    family_name?: unknown;
    email?: unknown;
    password?: unknown;
    lgpd_accepted?: unknown;
  } | null;

  const displayName = typeof body?.display_name === "string" ? body.display_name.trim() : "";
  const familyName = typeof body?.family_name === "string" ? body.family_name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const lgpdAccepted = body?.lgpd_accepted === true;

  if (!displayName || familyName.length < 2 || !email || password.length < 8) {
    return NextResponse.json({ error: "Preencha todos os campos corretamente." }, { status: 400 });
  }
  if (!lgpdAccepted) {
    return NextResponse.json({ error: "É preciso autorizar o tratamento dos dados." }, { status: 400 });
  }

  try {
    const admin = createServiceClient();
    const existing = await findUserByEmail(admin, email);
    let userId = existing?.id ?? null;

    if (existing?.app_metadata?.platform_admin === true) {
      return NextResponse.json(
        { error: "Conta administrativa entra em /admin/login — este cadastro é só da família." },
        { status: 409 },
      );
    }

    if (!userId) {
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
        app_metadata: { role: "owner", platform_admin: false },
      });

      if (created.error) {
        if (!alreadyRegistered(created.error)) {
          return NextResponse.json({ error: created.error.message }, { status: 400 });
        }
        userId = (await findUserByEmail(admin, email))?.id ?? null;
      } else {
        userId = created.data.user?.id ?? null;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Não foi possível criar a conta." }, { status: 500 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("id, family_id, role")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.role === "child") {
      return NextResponse.json({ error: "Esta conta é de filho. Use outro e-mail." }, { status: 409 });
    }

    if (profile?.family_id) {
      const matches = await emailPasswordMatches(email, password);
      if (!matches) {
        return NextResponse.json(
          { error: "Este e-mail já tem uma família. A senha não confere." },
          { status: 401 },
        );
      }

      const response = withDevFamilySession(
        NextResponse.json({ ok: true, family_id: profile.family_id, existing: true }),
        profile.family_id,
        isSecureRequest(request),
      );
      try {
        await attachProfileSession(response, userId);
      } catch (error) {
        console.error("register-family existing session", error);
      }
      return response;
    }

    const confirmed = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (confirmed.error) {
      return NextResponse.json({ error: confirmed.error.message }, { status: 400 });
    }

    const keys = familyKeysOnCreate();
    let familyInsert = await admin
      .from("families")
      .insert({
        name: familyName,
        lgpd_accepted_at: new Date().toISOString(),
        ...keys,
      })
      .select("id")
      .single();

    if (familyInsert.error) {
      familyInsert = await admin
        .from("families")
        .insert({
          name: familyName,
          lgpd_accepted_at: new Date().toISOString(),
          kids_access_key: keys.kids_access_key || generateKidsAccessKey(),
        })
        .select("id")
        .single();
    }

    const family = familyInsert.data;
    if (familyInsert.error || !family) {
      return NextResponse.json(
        { error: familyInsert.error?.message ?? "Falha ao criar família." },
        { status: 400 },
      );
    }

    await ensureParentAccessKey(admin, family.id);

    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      family_id: family.id,
      role: "owner",
      display_name: displayName,
    });
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role: "owner", family_id: family.id, platform_admin: false },
    });

    const response = withDevFamilySession(
      NextResponse.json({ ok: true, family_id: family.id }),
      family.id,
      isSecureRequest(request),
    );

    try {
      await attachProfileSession(response, userId);
    } catch (error) {
      console.error("register-family session", error);
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar a família.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
