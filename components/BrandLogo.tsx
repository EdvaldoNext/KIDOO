import Image from "next/image";

const LOGO = {
  sm: 36,
  md: 44,
  header: 64,
  nav: 72,
  lg: 96,
  hero: 128,
} as const;

export function BrandLogo({
  size = "md",
  wordmark = true,
  tone = "default",
  className = "",
}: {
  size?: keyof typeof LOGO;
  wordmark?: boolean;
  tone?: "default" | "onDark";
  className?: string;
}) {
  const px = LOGO[size];
  const scale = size === "lg" || size === "hero" ? "text-4xl" : size === "sm" ? "text-xl" : "text-2xl";

  return (
    <div className={`flex shrink-0 items-center gap-2 font-extrabold tracking-tight ${scale}`}>
      <Image
        src="/kidoo-logo.png"
        alt="KIDOO"
        width={px}
        height={px}
        className={`rounded-2xl object-cover shadow-md ${className}`}
        priority={size === "header" || size === "nav" || size === "lg" || size === "hero"}
      />
      {wordmark ? (
        <span>
          <span className={tone === "onDark" ? "text-white" : "text-navy"}>K</span>
          <span className="text-gold">i</span>
          <span className="text-success">d</span>
          <span className={tone === "onDark" ? "text-white" : "text-royal"}>oo</span>
        </span>
      ) : null}
    </div>
  );
}
