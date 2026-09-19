"use client";

import { useEffect } from "react";

const STORAGE_KEY = "kidoo-app-version";

export function AppAutoUpdate() {
  useEffect(() => {
    let cancelled = false;

    async function check() {
      const response = await fetch("/api/app-version", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { version?: string };
      const version = payload.version;
      if (cancelled || !version || version === "dev") return;

      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (seen && seen !== version) {
        window.localStorage.setItem(STORAGE_KEY, version);
        window.location.reload();
        return;
      }
      window.localStorage.setItem(STORAGE_KEY, version);
    }

    void check();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 60_000);

    function onVisible() {
      if (document.visibilityState === "visible") void check();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
