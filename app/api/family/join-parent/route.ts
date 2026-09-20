import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { attachProfileSession, syncProfileAuthClaims } from "@/lib/auth-session";
import { clearSignedOut, isSecureRequest, withDevFamilySession } from "@/lib/dev-cookies";
import { findFamilyByParentKeys } from "@/lib/parent-invite";

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
    email?: unknown;
    password?: unknown;
    kids_access_key?: unknown;
    parent_invite_code?: unknown;
    lgpd_accepted?: unknown;
  } | null;

  const displayName = typeof body?.display_name === "string" ? body.display_name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const kidsAccessKey = typeof body?.kids_access_key === "string" ? body.kids_access_key : "";
  const parentInviteCode = typeof body?.parent_invite_code === "string" ? body.parent_invite_code : "";
  const lgpdAccepted = body?.lgpd_accepted === true;

  if (!displayName || !email || password.length < 8) {
    return NextResponse.json({ error: "Preencha nome, e-mail e senha (mín. 8 caracteres)." }, { status: 400 });
  }
  if (!lgpdAccepted) {
    return NextResponse.json({ error: "É preciso autorizar o tratamento dos dados." }, { status: 400 });
  }

  try {
    const admin = createServiceClient();
    const family = await findFamilyByParentKeys(admin, kidsAccessKey, parentInviteCode);

    if (!family) {
      return NextResponse.json({ error: "Chaves inválidas. Use CASA e PAIS desta família." }, { status: 401 });
    }

    const existing = await findUserByEmail(admin, email);
    let userId = existing?.id ?? null;

    if (!userId) {
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
        app_metadata: { role: "parent", family_id: family.id, platform_admin: false },
      });

      if (created.error) {
        if (!alreadyRegistered(created.error)) {
          return NextResponse.json({ error: created.error.message }, { status: 400 });
        }
        const again = await findUserByEmail(admin, email);
        userId = again?.id ?? null;
      } else {
        userId = created.data.user?.id ?? null;
      }
    } else {
      const updated = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
        app_metadata: { role: "parent", family_id: family.id, platform_admin: false },
      });
      if (updated.error) {
        return NextResponse.json({ error: updated.error.message }, { status: 400 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Não foi possível criar a conta." }, { status: 500 });
    }

    const { data: profile } = await admin.from("profiles").select("id, family_id, role").eq("id", userId).maybeSingle();

    if (profile?.family_id && profile.family_id !== family.id) {
      return NextResponse.json(
        { error: "Este e-mail já pertence a outra família. Use outro e-mail ou entre na conta existente." },
        { status: 409 },
      );
    }

    if (profile?.role === "child") {
      return NextResponse.json({ error: "Esta conta é de filho. Use o e-mail do pai ou da mãe." }, { status: 409 });
    }

    if (!profile) {
      const { error: profileError } = await admin.from("profiles").insert({
        id: userId,
        family_id: family.id,
        role: "parent",
        display_name: displayName,
      });
      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }
    } else if (profile.role !== "owner" && profile.role !== "parent") {
      return NextResponse.json({ error: "Esta conta não pode entrar como pai ou mãe." }, { status: 409 });
    } else {
      const { error: nameError } = await admin
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", userId);
      if (nameError) {
        return NextResponse.json({ error: nameError.message }, { status: 400 });
      }
    }

    const response = clearSignedOut(
      withDevFamilySession(
        NextResponse.json({ ok: true, family_id: family.id }),
        family.id,
        isSecureRequest(request),
      ),
      isSecureRequest(request),
    );
    try {
      await syncProfileAuthClaims(userId);
      await attachProfileSession(response, userId);
    } catch (error) {
      console.error("join-parent session", error);
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível entrar na família.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
