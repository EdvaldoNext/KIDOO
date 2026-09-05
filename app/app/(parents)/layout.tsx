import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { DevModeBanner } from "@/components/DevModeBanner";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "KIDOO",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "KIDOO",
    statusBarStyle: "default",
  },
};

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/app", label: "Hoje" },
  { href: "/app/tarefas", label: "Tarefas" },
  { href: "/app/aprovacoes", label: "Aprovar" },
  { href: "/app/localizacao", label: "Local" },
  { href: "/app/filhos", label: "Filhos" },
  { href: "/app/pontos", label: "Pontos" },
  { href: "/app/configuracoes", label: "Config" },
];

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full min-w-0 overflow-x-hidden bg-canvas">
      <DevModeBanner />
      <header className="sticky top-0 z-20 border-b border-navy/10 bg-royal text-white">
        <div className="mx-auto flex w-full min-w-0 max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <BrandLogo size="sm" />
          <SignOutButton label="Sair" />
        </div>
        <nav className="mx-auto flex w-full min-w-0 max-w-6xl flex-wrap gap-1.5 px-4 pb-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold hover:bg-white/20 sm:px-3 sm:text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
