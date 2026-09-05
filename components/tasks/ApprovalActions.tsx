"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";

export function ApprovalActions({ completionId }: { completionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function decide(approve: boolean) {
    setPending(true);
    const note = approve ? null : window.prompt("Motivo da rejeição (opcional)") ?? "";

    if (CLIENT_DEV_BYPASS_AUTH) {
      await fetch("/api/dev/approve-completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completion_id: completionId,
          approve,
          note: note || null,
        }),
      });
      router.refresh();
      setPending(false);
      return;
    }

    const supabase = createClient();
    await supabase.rpc("approve_completion", {
      p_completion_id: completionId,
      p_approve: approve,
      p_note: note || null,
    });
    router.refresh();
    setPending(false);
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={() => decide(true)}
        className="rounded-xl bg-success px-4 py-2 font-bold text-navy"
      >
        Aprovar
      </button>
      <button
        disabled={pending}
        onClick={() => decide(false)}
        className="rounded-xl bg-alert px-4 py-2 font-bold text-white"
      >
        Rejeitar
      </button>
    </div>
  );
}
