import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/backend/auth-users";
import { createResetToken } from "@/lib/backend/password-reset";
import { mailerConfigured, passwordResetEmail, sendMail } from "@/lib/mailer";

/** Starts a password reset. Always answers ok for unknown e-mails so accounts cannot be probed. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  if (!mailerConfigured()) {
    console.error("recover: RESEND_API_KEY / MAIL_FROM não configurados.");
    return NextResponse.json({ error: "O envio de e-mail ainda não está configurado." }, { status: 503 });
  }

  try {
    const user = await findUserByEmail(email);
    const role = user?.app_metadata?.role;
    const isFamilyParent = role === "owner" || role === "parent" || (!role && user?.app_metadata?.platform_admin !== true);

    if (user && user.email && isFamilyParent && !user.email.endsWith("@users.kidoo.internal")) {
      const token = await createResetToken(user.id);
      if (token) {
        const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || new URL(request.url).origin;
        const link = `${origin}/redefinir-senha?token=${token}`;
        const mail = passwordResetEmail(link);
        const sent = await sendMail({ to: user.email, ...mail });
        if (!sent.ok) console.error("recover: falha ao enviar e-mail", sent.error);
      }
    }
  } catch (error) {
    console.error("recover", error);
  }

  return NextResponse.json({ ok: true });
}
