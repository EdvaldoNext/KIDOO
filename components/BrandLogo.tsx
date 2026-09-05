export function BrandLogo({
  size = "md",
  wordmark = true,
}: {
  size?: "sm" | "md" | "lg";
  wordmark?: boolean;
}) {
  const scale = size === "lg" ? "text-4xl" : size === "sm" ? "text-xl" : "text-2xl";
  return (
    <div className={`flex shrink-0 items-center gap-2 font-extrabold tracking-tight ${scale}`}>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-gold text-navy shadow-sm">
        ★
      </span>
      {wordmark ? (
        <span>
          <span className="text-navy">K</span>
          <span className="text-gold">i</span>
          <span className="text-success">d</span>
          <span className="text-royal">oo</span>
        </span>
      ) : null}
    </div>
  );
}
