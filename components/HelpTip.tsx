type HelpTipProps = {
  label: string;
  children: string;
  align?: "left" | "right";
  tone?: "default" | "onMedia";
};

export function HelpTip({
  label,
  children,
  align = "left",
  tone = "default",
}: HelpTipProps) {
  const onMedia = tone === "onMedia";

  return (
    <details className={`help-tip relative inline-block align-middle ${onMedia ? "" : "ml-1"}`}>
      <summary
        className={
          onMedia
            ? "inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-white/90 text-sm font-extrabold text-navy shadow-md backdrop-blur-sm [&::-webkit-details-marker]:hidden"
            : "inline-flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded-full bg-navy/10 text-xs font-extrabold text-navy [&::-webkit-details-marker]:hidden"
        }
        aria-label={label}
      >
        ?
      </summary>
      <p
        role="tooltip"
        className={`absolute z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-navy p-3 text-sm font-semibold leading-snug text-white shadow-lg ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {children}
      </p>
    </details>
  );
}
