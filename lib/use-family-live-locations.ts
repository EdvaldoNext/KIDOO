"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";
import type { LiveLocationRow } from "@/lib/live-location";

const POLL_MS = 3000;

export function useFamilyLiveLocations(
  childId?: string | null,
  initial: LiveLocationRow[] = [],
): LiveLocationRow[] {
  const [rows, setRows] = useState(initial);

  useEffect(() => {
    setRows(initial);
  }, [childId, initial[0]?.child_id, initial[0]?.captured_at, initial[0]?.lat, initial[0]?.lng]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const path = childId
        ? `/api/family/live-location?childId=${encodeURIComponent(childId)}`
        : "/api/family/live-location";
      const response = await fetch(path);
      if (!response.ok) return;
      const payload = (await response.json()) as { locations?: LiveLocationRow[] };
      if (cancelled || !payload.locations) return;
      setRows(payload.locations);
    }

    void refresh();
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);

    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisible);

    const supabase = CLIENT_DEV_BYPASS_AUTH ? null : createClient();
    const channel = supabase
      ?.channel(`kidoo-live-${childId ?? "family"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "child_live_locations",
          ...(childId ? { filter: `child_id=eq.${childId}` } : {}),
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [childId]);

  return rows;
}
