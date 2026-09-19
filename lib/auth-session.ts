import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { signInAsChild } from "@/lib/kids-access";

export async function establishProfileSession(profileId: string) {
  const admin = createServiceClient();
  const tokenHash = await signInAsChild(admin, profileId);
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (error) {
    throw new Error("Não foi possível entrar. Tente de novo.");
  }
}
