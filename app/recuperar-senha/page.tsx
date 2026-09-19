import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { RecoverPasswordForm } from "@/components/login/RecoverPasswordForm";

export default function RecoverPasswordPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8">
        <BrandLogo size="lg" />
      </Link>
      <RecoverPasswordForm />
    </div>
  );
}
