import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { SignUpForm } from "@/components/login/SignUpForm";
import { DevModeBanner } from "@/components/DevModeBanner";

export default function CadastroPage() {
  return (
    <div className="min-h-full">
      <DevModeBanner />
      <div className="flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8">
        <BrandLogo size="lg" />
      </Link>
      <p className="mb-4 max-w-md text-center text-navy/70">
        Cadastro só para pais. Depois você cadastra os filhos e envia o link com
        a chave da família.
      </p>
      <SignUpForm />
      </div>
    </div>
  );
}
