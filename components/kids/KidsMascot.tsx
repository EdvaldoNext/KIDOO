import { BrandLogo } from "@/components/BrandLogo";

export function KidsMascot({
  size = "header",
  caption,
}: {
  size?: "sm" | "md" | "header" | "lg" | "hero";
  caption?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <BrandLogo size={size} wordmark={false} />
      {caption ? <p className="text-center font-extrabold text-navy/70">{caption}</p> : null}
    </div>
  );
}
