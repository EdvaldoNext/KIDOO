"use client";

import { useEffect, useState } from "react";
import { requestBrowserPosition } from "@/lib/geo";
import { isAndroidPhone, isStandaloneApp, KIDS_PLAY_STORE_URL } from "@/lib/kids-install";
import { isNativeAndroid } from "@/lib/native-location";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function KidsPhoneSetup({
  required = false,
}: {
  required?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [android, setAndroid] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setAndroid(isAndroidPhone());
    setInstalled(isStandaloneApp() || isNativeAndroid());
    if (!required) {
      setHidden(window.localStorage.getItem("kidoo-install-dismissed") === "1");
    }
    setReady(true);

    function onPrompt(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [required]);

  if (!ready || !android || installed || hidden) return null;

  async function installAndAllow() {
    setPending(true);
    setStatus(null);

    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
    } else if (KIDS_PLAY_STORE_URL) {
      window.location.href = KIDS_PLAY_STORE_URL;
      return;
    }

    const geo = await requestBrowserPosition();
    setPending(false);
    if (geo.ok) {
      setStatus("Pronto. O Android já pode pedir a localização; aceite para os pais verem o mapa.");
      return;
    }
    setStatus(
      deferred
        ? geo.message
        : "Toque em Instalar na janela do Android. Se ela não aparecer, abra o menu do Chrome (3 pontinhos) e toque em Instalar app.",
    );
  }

  function dismiss() {
    window.localStorage.setItem("kidoo-install-dismissed", "1");
    setHidden(true);
  }

  return (
    <div className="mb-6 rounded-3xl bg-gold p-5 text-navy shadow-[0_4px_0_#c9a000]">
      <p className="text-xl font-extrabold">Instalar o KIDOO neste celular</p>
      <p className="mt-2 text-sm font-bold text-navy/80">
        Um toque. O Android pede permissão. Depois o ícone fica na tela inicial — não precisa computador.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => void installAndAllow()}
        className="mt-4 w-full rounded-2xl bg-navy py-4 text-lg font-extrabold text-white disabled:opacity-60"
      >
        {pending ? "Abrindo o Android..." : "Instalar e permitir localização"}
      </button>
      {status ? <p className="mt-3 text-sm font-bold">{status}</p> : null}
      {!required ? (
        <button type="button" onClick={dismiss} className="mt-3 text-sm font-extrabold text-navy/70">
          Agora não
        </button>
      ) : null}
    </div>
  );
}
