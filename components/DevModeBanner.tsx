import { DEV_BYPASS_AUTH } from "@/lib/config";

export function DevModeBanner() {
  if (!DEV_BYPASS_AUTH) return null;

  return (
    <div className="bg-gold px-3 py-2 text-center text-xs font-bold text-navy sm:px-4 sm:text-sm">
      <p className="mx-auto max-w-6xl wrap-break-word">
        Modo teste — autenticação desativada. Defina AUTH_ENABLED=true para restaurar login.
      </p>
    </div>
  );
}
