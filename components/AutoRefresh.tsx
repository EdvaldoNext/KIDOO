"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_INTERVAL_MS = 5000;

export function AutoRefresh({ intervalMs = DEFAULT_INTERVAL_MS }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let timeoutId = 0;

    function refreshIfVisible() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    function schedule() {
      timeoutId = window.setTimeout(tick, intervalMs);
    }

    function tick() {
      if (cancelled) return;
      refreshIfVisible();
      schedule();
    }

    function onVisibility() {
      if (cancelled || document.visibilityState !== "visible") return;
      window.clearTimeout(timeoutId);
      refreshIfVisible();
      schedule();
    }

    schedule();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
