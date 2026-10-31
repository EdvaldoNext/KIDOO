import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { ResetPasswordForm } from "@/components/login/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? (params.token[0] ?? "") : (params.token ?? "");

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8">
        <BrandLogo size="lg" />
      </Link>
      <ResetPasswordForm token={token} />
    </div>
  );
}
