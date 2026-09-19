import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { createProfileLoginToken } from "@/lib/kids-access";

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
            response.cookies.set(name, value, options);
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
