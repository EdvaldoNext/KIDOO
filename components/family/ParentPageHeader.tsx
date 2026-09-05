import type { ReactNode } from "react";

export function ParentPageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <p className="text-sm font-bold text-royal">{eyebrow}</p> : null}
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {subtitle ? <p className="mt-1 text-navy/70">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ParentTrustStrip({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-navy/5 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-semibold text-navy/80">{children}</p>
      {aside ? <div className="shrink-0 text-navy/55">{aside}</div> : null}
    </section>
  );
}
