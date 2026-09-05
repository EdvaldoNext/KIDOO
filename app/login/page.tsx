import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginForm } from "@/components/login/LoginForm";
import { DevModeBanner } from "@/components/DevModeBanner";
import { CLIENT_DEV_BYPASS_AUTH } from "@/lib/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string }>;
}) {
  const { modo } = await searchParams;
  const defaultMode = modo === "filho" ? "child" : "parent";

  return (
    <div className="min-h-full">
      <DevModeBanner />
      <div className="flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8">
        <BrandLogo size="lg" />
      </Link>
      <p className="mb-4 max-w-md text-center text-navy/70">
        {CLIENT_DEV_BYPASS_AUTH
          ? "Modo teste: entre direto, sem código, PIN ou senha."
          : defaultMode === "child"
            ? "Use o código e o PIN que seus pais te passaram."
            : "Pais entram com e-mail. Filhos entram com código e PIN."}
      </p>
      <LoginForm defaultMode={defaultMode} />
      </div>
    </div>
  );
}
