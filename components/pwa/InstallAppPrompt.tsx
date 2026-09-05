"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppPrompt({
  title,
  description,
  dismissKey,
}: {
  title: string;
  description: string;
  dismissKey: string;
}) {
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || Boolean(nav.standalone));
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    setHidden(window.localStorage.getItem(dismissKey) === "1");

    function onPrompt(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [dismissKey]);

  if (standalone || hidden) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setHidden(true);
    setDeferred(null);
  }

  function dismiss() {
    window.localStorage.setItem(dismissKey, "1");
    setHidden(true);
  }

  return (
    <div className="mb-6 rounded-2xl bg-gold/20 p-5 ring-1 ring-gold">
      <p className="font-extrabold">{title}</p>
      <p className="mt-2 text-sm font-semibold text-navy/80">{description}</p>
      {deferred ? (
        <button
          type="button"
          onClick={() => void install()}
          className="mt-4 w-full rounded-xl bg-success px-4 py-3 font-extrabold text-navy sm:w-auto"
        >
          Instalar no celular
        </button>
      ) : (
        <p className="mt-3 text-sm font-bold text-navy/80">
          {ios
            ? "Toque em Compartilhar e depois em Adicionar à Tela de Início."
            : "No Chrome, toque nos 3 pontinhos e depois em Instalar app."}
        </p>
      )}
      <button type="button" onClick={dismiss} className="mt-3 text-sm font-bold text-royal">
        Agora não
      </button>
    </div>
  );
}
