import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { createProfileLoginToken } from "@/lib/kids-access";
import { DEV_COOKIE_MAX_AGE } from "@/lib/dev-cookies";

export async function emailPasswordMatches(email: string, password: string) {
  const admin = createServiceClient();
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) {
    throw new Error(listed.error.message);
  }
  const user = listed.data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
  if (!user) return false;

  if (!user.email_confirmed_at) {
    const confirmed = await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
    if (confirmed.error) {
      throw new Error(confirmed.error.message);
    }
  }

  const auth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await auth.auth.signInWithPassword({ email, password });
  return !error;
}

export async function attachProfileSession(response: NextResponse, profileId: string) {
  const { tokenHash } = await createProfileLoginToken(createServiceClient(), profileId);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              path: "/",
              maxAge: options.maxAge ?? DEV_COOKIE_MAX_AGE,
              sameSite: options.sameSite ?? "lax",
            });
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
  if (!error) return response;

  const retry = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (!retry.error) return response;

  throw new Error(error.message || "Não foi possível entrar. Tente de novo.");
}
