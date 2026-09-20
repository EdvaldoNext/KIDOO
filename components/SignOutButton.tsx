"use client";

import { createClient } from "@/utils/supabase/client";
import { KidooLocation, isNativeAndroid } from "@/lib/native-location";

export function SignOutButton({
  label = "Sair",
  redirectTo = "/",
  keepAuth = false,
}: {
  label?: string;
  redirectTo?: string;
  forgetDevice?: boolean;
  keepAuth?: boolean;
}) {
  return (
    <button
      type="button"
      className="shrink-0 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-bold"
      onClick={async () => {
        if (isNativeAndroid()) {
          await KidooLocation.stop();
        }
        try {
          if (keepAuth) {
            await fetch("/api/auth/leave-session", { method: "POST" });
          } else {
            await fetch("/api/auth/logout", { method: "POST" });
            const supabase = createClient();
            await supabase.auth.signOut({ scope: "local" });
          }
        } finally {
          window.location.replace(redirectTo);
        }
      }}
    >
      {label}
    </button>
  );
}
