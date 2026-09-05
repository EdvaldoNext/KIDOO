import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { SignOutButton } from "@/components/SignOutButton";

const NAV = [
  { href: "/admin", label: "Analytics" },
  { href: "/admin/familias", label: "Famílias" },
  { href: "/admin/configuracoes", label: "Configurações" },
  { href: "/admin/saude", label: "Saúde" },
];

export default function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-canvas">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <span className="rounded-full bg-alert px-2 py-0.5 text-xs font-extrabold">
              ADMIN
            </span>
          </div>
          <SignOutButton label="Sair" redirectTo="/admin/login" />
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 px-4 pb-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold hover:bg-white/20"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
