"use client";

import { useEffect, useRef, useState } from "react";
import { monthLabel } from "@/lib/dates";

type MonthSelectProps = {
  value: string;
  months: string[];
  onChange: (value: string) => void;
};

export function MonthSelect({ value, months, onChange }: MonthSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const options = [{ value: "all", label: "Todos os meses" }, ...months.map((key) => ({ value: key, label: monthLabel(key) }))];
  const currentLabel = options.find((option) => option.value === value)?.label ?? "Mês";

  return (
    <div ref={rootRef} className="relative z-30 text-sm font-bold">
      <p>Mês</p>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="mt-1 flex w-full items-center justify-between rounded-xl border border-navy/10 bg-canvas px-3 py-2 text-left font-semibold sm:w-56"
      >
        <span>{currentLabel}</span>
        <span aria-hidden="true" className={`text-navy/50 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute top-full left-0 z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-navy/10 bg-white py-1 shadow-lg sm:w-56"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left font-semibold ${
                    selected ? "bg-royal text-white" : "text-navy hover:bg-canvas"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
