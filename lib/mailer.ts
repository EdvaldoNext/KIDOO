/**
 * Transactional e-mail (password recovery). Supabase used to send these for us; now we call
 * Resend's HTTP API directly. Configure RESEND_API_KEY and MAIL_FROM (a verified sender).
 */
export function mailerConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim());
}

export async function sendMail(input: { to: string; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!apiKey || !from) {
    return { ok: false as const, error: "mailer_not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return { ok: false as const, error: `resend_${response.status}: ${detail.slice(0, 200)}` };
  }
  return { ok: true as const };
}

export function passwordResetEmail(link: string) {
  const text = `Você pediu para criar uma senha nova no KIDOO.\n\nAbra o link (vale por 1 hora):\n${link}\n\nSe não foi você, ignore este e-mail.`;
  const html = `<div style="font-family:Arial,sans-serif;color:#13294b;line-height:1.5">
  <h2>Nova senha no KIDOO</h2>
  <p>Você pediu para criar uma senha nova. O link vale por 1 hora.</p>
  <p><a href="${link}" style="display:inline-block;background:#187bcd;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:bold">Criar senha nova</a></p>
  <p style="font-size:13px;color:#51607a">Se o botão não abrir, copie este endereço:<br>${link}</p>
  <p style="font-size:13px;color:#51607a">Se não foi você, ignore este e-mail.</p>
</div>`;
  return { subject: "Crie sua senha nova no KIDOO", html, text };
}
