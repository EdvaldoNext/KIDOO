"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  short?: string;
  tone?: "primary" | "secondary" | "action";
};

const NAV: NavItem[] = [
  { href: "/app", label: "Hoje" },
  { href: "/app/tarefas", label: "Tarefas" },
  { href: "/app/aprovacoes", label: "Aprovar", tone: "action" },
  { href: "/app/filhos", label: "Filhos" },
  { href: "/app/pontos", label: "Pontos" },
  { href: "/app/localizacao", label: "Localização", short: "Local", tone: "secondary" },
  { href: "/app/historico", label: "Histórico", tone: "secondary" },
  { href: "/app/configuracoes", label: "Configurações", short: "Config", tone: "secondary" },
];

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ParentNav({
  waitingCount = 0,
  pointsLabel = "Pontos",
}: {
  waitingCount?: number;
  pointsLabel?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex w-full min-w-0 max-w-6xl flex-wrap gap-1.5 px-4 pb-3" aria-label="Painel dos pais">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const label = item.href === "/app/pontos" ? pointsLabel : item.label;
        const waiting = item.tone === "action" && waitingCount > 0;
        const className = active
          ? "bg-white text-royal"
          : waiting
            ? "bg-gold text-navy hover:bg-gold/90"
            : item.tone === "secondary"
              ? "bg-white/5 text-white/80 hover:bg-white/15"
              : "bg-white/10 text-white hover:bg-white/20";

        return (
          <Link
            key={item.href}
            href={item.href}
            title={label}
            aria-current={active ? "page" : undefined}
            aria-label={waiting ? `${label}, ${waitingCount} pendentes` : undefined}
            className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-bold sm:px-3 sm:text-sm ${className}`}
          >
            <span className={item.short ? "sm:hidden" : undefined}>{item.short ?? label}</span>
            {item.short ? <span className="hidden sm:inline">{label}</span> : null}
            {waiting ? (
              <span className="ml-1.5 rounded-full bg-navy px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-gold">
                {waitingCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
