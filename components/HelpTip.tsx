type HelpTipProps = {
  label: string;
  children: string;
};

export function HelpTip({ label, children }: HelpTipProps) {
  return (
    <details className="help-tip relative ml-1 inline-block align-middle">
      <summary
        className="inline-flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded-full bg-navy/10 text-xs font-extrabold text-navy [&::-webkit-details-marker]:hidden"
        aria-label={label}
      >
        ?
      </summary>
      <p
        role="tooltip"
        className="absolute left-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-navy p-3 text-sm font-semibold leading-snug text-white shadow-lg"
      >
        {children}
      </p>
    </details>
  );
}
