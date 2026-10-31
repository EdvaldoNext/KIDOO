"use client";

import { useEffect, useState } from "react";
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

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [childId]);

  return rows;
}
