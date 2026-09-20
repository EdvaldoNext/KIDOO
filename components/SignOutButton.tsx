"use client";

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
  const action = keepAuth ? "/api/auth/leave-session" : "/api/auth/logout";

  return (
    <form
      action={action}
      method="POST"
      onSubmit={() => {
        if (isNativeAndroid()) {
          void KidooLocation.stop();
        }
      }}
    >
      <input type="hidden" name="next" value={redirectTo} />
      <button type="submit" className="shrink-0 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-bold">
        {label}
      </button>
    </form>
  );
}
