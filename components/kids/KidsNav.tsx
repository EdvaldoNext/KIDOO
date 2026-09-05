"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function KidsNav({ pointsLabel }: { pointsLabel: string }) {
  const pathname = usePathname();
  const onTasks = pathname === "/app/kids";
  const onPoints = pathname.startsWith("/app/kids/pontos");
  const pointsIcon = pointsLabel.toLowerCase().includes("mesada") ? "💰" : "⭐";

  return (
    <nav className="flex flex-wrap gap-2 px-4 py-3" aria-label="Área das crianças">
      <Link
        href="/app/kids"
        className={`kids-pop inline-flex min-h-12 items-center gap-2 rounded-2xl px-4 py-3 font-extrabold ${
          onTasks ? "bg-gold text-navy shadow-[0_3px_0_#c9a000]" : "bg-white ring-2 ring-navy/10"
        }`}
      >
        <span aria-hidden>🎯</span>
        Missões
      </Link>
      <Link
        href="/app/kids/pontos"
        className={`kids-pop inline-flex min-h-12 items-center gap-2 rounded-2xl px-4 py-3 font-extrabold ${
          onPoints ? "bg-gold text-navy shadow-[0_3px_0_#c9a000]" : "bg-white ring-2 ring-navy/10"
        }`}
      >
        <span aria-hidden>{pointsIcon}</span>
        {pointsLabel}
      </Link>
    </nav>
  );
}
