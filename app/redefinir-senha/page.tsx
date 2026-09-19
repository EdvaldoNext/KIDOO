import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { ResetPasswordForm } from "@/components/login/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8">
        <BrandLogo size="lg" />
      </Link>
      <ResetPasswordForm />
    </div>
  );
}
