"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function KidsNav({ pointsLabel }: { pointsLabel: string }) {
  const pathname = usePathname();
  const onTasks = pathname === "/app/kids";
  const onPoints = pathname.startsWith("/app/kids/pontos");

  return (
    <nav className="flex flex-wrap gap-2 px-4 py-3">
      <Link
        href="/app/kids"
        className={`rounded-2xl px-4 py-3 font-extrabold ${
          onTasks ? "bg-gold text-navy" : "bg-white ring-1 ring-navy/10"
        }`}
      >
        Tarefas
      </Link>
      <Link
        href="/app/kids/pontos"
        className={`rounded-2xl px-4 py-3 font-extrabold ${
          onPoints ? "bg-gold text-navy" : "bg-white ring-1 ring-navy/10"
        }`}
      >
        {pointsLabel}
      </Link>
    </nav>
  );
}
