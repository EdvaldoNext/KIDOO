const COLORS = ["bg-royal text-white", "bg-success text-navy", "bg-gold text-navy", "bg-pending text-navy"];

export function KidAvatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const color = COLORS[name.length % COLORS.length];
  const sizeClass =
    size === "lg" ? "h-20 w-20 text-3xl" : size === "sm" ? "h-10 w-10 text-sm" : "h-14 w-14 text-xl";

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-extrabold ${color} ${sizeClass} ${className}`}
    >
      {initials || "?"}
    </span>
  );
}
