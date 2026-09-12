import { formatAllowanceMoney, type AllowanceSnapshot } from "@/lib/allowance";

export function AllowanceStatus({
  snapshot,
  voice = "parent",
  size = "large",
}: {
  snapshot: AllowanceSnapshot;
  voice?: "parent" | "child";
  size?: "compact" | "large";
}) {
  const child = voice === "child";
  const paidLabel = child ? "Já recebeu" : "Pago";
  const dueLabel = child ? "Ainda falta" : "A pagar";
  const settledLabel = child ? "Tudo recebido" : "Tudo em dia";
  const compact = size === "compact";

  return (
    <div className={compact ? "mt-1 space-y-1.5" : "mt-3 space-y-2"}>
      <div
        className="h-2 overflow-hidden rounded-full bg-navy/10"
        role="progressbar"
        aria-label={child ? "Quanto da mesada já foi recebida" : "Quanto da mesada já foi pago"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(snapshot.paidRatio * 100)}
      >
        <div
          className={`h-full rounded-full ${snapshot.settled ? "bg-success" : "bg-royal"}`}
          style={{ width: `${Math.round(snapshot.paidRatio * 100)}%` }}
        />
      </div>
      <div className={`grid grid-cols-2 gap-2 ${compact ? "text-[11px] sm:text-sm" : "text-sm"}`}>
        <p className={`rounded-xl px-2.5 py-2 font-bold ${snapshot.hasPaid ? "bg-success/15 text-navy" : "bg-navy/5 text-navy/70"}`}>
          <span className="block text-[10px] font-extrabold uppercase tracking-wide text-navy/50 sm:text-xs">
            {paidLabel}
          </span>
          {formatAllowanceMoney(snapshot.paid)}
        </p>
        <p
          className={`rounded-xl px-2.5 py-2 font-bold ${
            snapshot.settled ? "bg-success/15 text-navy" : snapshot.due > 0 ? "bg-gold/20 text-navy" : "bg-navy/5 text-navy/70"
          }`}
        >
          <span className="block text-[10px] font-extrabold uppercase tracking-wide text-navy/50 sm:text-xs">
            {snapshot.settled ? settledLabel : dueLabel}
          </span>
          {snapshot.settled ? "Pronto" : formatAllowanceMoney(snapshot.due)}
        </p>
      </div>
    </div>
  );
}
