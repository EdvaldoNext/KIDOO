"use client";

import { useEffect, useState } from "react";

export function ResumeDeviceSession({
  as,
}: {
  as?: "parent" | "child" | "any";
}) {
  const [status, setStatus] = useState<"idle" | "trying" | "done">("idle");

  useEffect(() => {
    let cancelled = false;
    setStatus("trying");

    async function resume() {
      try {
        const response = await fetch("/api/auth/resume-device", { method: "POST" });
        const payload = (await response.json()) as { ok?: boolean; role?: string | null };
        if (cancelled) return;
        if (!response.ok || !payload.ok || !payload.role) {
          setStatus("done");
          return;
        }
        if (as === "parent" && payload.role !== "parent") {
          setStatus("done");
          return;
        }
        if (as === "child" && payload.role !== "child") {
          setStatus("done");
          return;
        }
        window.location.replace(payload.role === "child" ? "/app/kids" : "/app");
      } catch {
        if (!cancelled) setStatus("done");
      }
    }

    void resume();
    return () => {
      cancelled = true;
    };
  }, [as]);

  if (status !== "trying") return null;

  return <p className="text-center text-sm font-bold text-navy/60">Entrando neste celular…</p>;
}
