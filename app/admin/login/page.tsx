import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { BrandLogo } from "@/components/BrandLogo";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-navy px-4">
      <div className="mb-8 brightness-0 invert">
        <BrandLogo />
      </div>
      <AdminLoginForm />
    </div>
  );
}
