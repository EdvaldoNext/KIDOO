"use client";

import { App } from "@capacitor/app";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const RELOAD_PREFIX = "kidoo-reload-";
const RUNNING_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";

function currentUrl() {
  return new URL(window.location.href);
}

function rememberReload(version: string) {
  window.sessionStorage.setItem(`${RELOAD_PREFIX}${version}`, "1");
}

function alreadyReloaded(version: string) {
  return window.sessionStorage.getItem(`${RELOAD_PREFIX}${version}`) === "1";
}

async function clearPageCaches() {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

export function AppAutoUpdate() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    function refreshData() {
      if (!cancelled) router.refresh();
    }

    async function check() {
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.getRegistration().then((registration) => registration?.update());
      }

      let response: Response;
      try {
        response = await fetch(`/api/app-version?t=${Date.now()}`, { cache: "no-store" });
      } catch {
        refreshData();
        return;
      }
      if (!response.ok || cancelled) return;

      const payload = (await response.json()) as { version?: string };
      const version = payload.version;
      if (!version || version === "dev" || RUNNING_VERSION === "dev" || version === RUNNING_VERSION) {
        if (version) window.sessionStorage.removeItem(`${RELOAD_PREFIX}${version}`);
        const url = currentUrl();
        if (url.searchParams.has("v")) {
          url.searchParams.delete("v");
          window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
        }
        refreshData();
        return;
      }

      if (alreadyReloaded(version)) {
        refreshData();
        return;
      }

      rememberReload(version);
      try {
        await clearPageCaches();
      } catch {
        // A página nova ainda precisa carregar mesmo se o cache do navegador não sair.
      }
      if (cancelled) return;
      const url = currentUrl();
      url.searchParams.set("v", `${version.slice(0, 12)}-${Date.now()}`);
      window.location.replace(url.toString());
    }

    void check();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 60_000);

    function onVisible() {
      if (document.visibilityState === "visible") void check();
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);

    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void check();
    });

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
      void listener.then((handle) => handle.remove());
    };
  }, [router]);

  return null;
}
