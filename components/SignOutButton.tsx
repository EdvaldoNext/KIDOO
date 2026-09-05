"use client";

import { createClient } from "@/utils/supabase/client";

export function SignOutButton({
  label = "Sair",
  redirectTo = "/login",
}: {
  label?: string;
  redirectTo?: string;
}) {
  return (
    <button
      type="button"
      className="shrink-0 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-bold"
      onClick={async () => {
        await fetch("/api/auth/kids-logout", { method: "POST" });
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = redirectTo;
      }}
    >
      {label}
    </button>
  );
}
