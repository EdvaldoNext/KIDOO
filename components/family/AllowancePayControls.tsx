"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatAllowanceMoney, type AllowanceSnapshot } from "@/lib/allowance";

export function AllowancePayControls({
  childId,
  childName,
  snapshot,
}: {
  childId: string;
  childName: string;
  snapshot: AllowanceSnapshot;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "pay" | "undo">("idle");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function request(method: "POST" | "DELETE", amount?: number) {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/family/allowance-payouts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(amount == null ? { child_id: childId } : { child_id: childId, amount }),
      });
      const result = (await response.json()) as { error?: string; amount?: number };
      if (!response.ok) {
        setMessage(result.error ?? "Não deu para salvar agora.");
        return;
      }
      setStep("idle");
      setMessage(
        method === "POST"
          ? `Baixa de ${formatAllowanceMoney(result.amount ?? snapshot.due)} registrada.`
          : "Último pagamento desfeito.",
      );
      router.refresh();
    } catch {
      setMessage("Não deu para salvar agora. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  if (step === "pay") {
    return (
      <div className="mt-3 space-y-3 rounded-xl bg-canvas p-3">
        <p className="text-sm font-bold">
          Confirmar baixa de {formatAllowanceMoney(snapshot.due)} para {childName}? O total do mês continua.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void request("POST", snapshot.due)}
            className="min-h-11 rounded-xl bg-success px-4 py-2 font-bold text-navy disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Confirmar pagamento"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setStep("idle")}
            className="min-h-11 rounded-xl bg-white px-4 py-2 font-bold ring-1 ring-navy/10"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (step === "undo") {
    return (
      <div className="mt-3 space-y-3 rounded-xl bg-canvas p-3">
        <p className="text-sm font-bold">Desfazer o último pagamento de {childName}?</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void request("DELETE")}
            className="min-h-11 rounded-xl bg-alert px-4 py-2 font-bold text-white disabled:opacity-60"
          >
            {pending ? "Desfazendo..." : "Desfazer último"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setStep("idle")}
            className="min-h-11 rounded-xl bg-white px-4 py-2 font-bold ring-1 ring-navy/10"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {snapshot.due > 0 ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => setStep("pay")}
          className="min-h-11 w-full rounded-xl bg-royal px-4 py-2.5 font-bold text-white disabled:opacity-60 sm:w-auto"
        >
          Dar baixa de {formatAllowanceMoney(snapshot.due)}
        </button>
      ) : snapshot.hasEarnings ? (
        <p className="text-sm font-extrabold text-success">Mesada em dia. Novas tarefas entram no total.</p>
      ) : (
        <p className="text-sm font-semibold text-navy/55">Ainda não tem valor para pagar neste mês.</p>
      )}
      {snapshot.hasPaid ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => setStep("undo")}
          className="block text-sm font-bold text-navy/60 underline decoration-navy/20 underline-offset-2 hover:text-navy"
        >
          Desfazer último pagamento
        </button>
      ) : null}
      {message ? (
        <p className="text-sm font-semibold text-navy/70" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}
