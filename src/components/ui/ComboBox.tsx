"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { FieldShell, inputClasses } from "./Field";

export type ComboBoxOption = { id: string; label: string; hint?: string };

/**
 * Type ahead that also accepts anything the user types (PRD 16.2).
 * Suggestions come from the master list; a value that is not in the list is
 * still accepted and is sent to the admin queue when the form is submitted.
 */
export function ComboBox({
  label,
  name,
  list,
  value,
  onChange,
  placeholder,
  hint,
  error,
  required,
}: {
  label: string;
  name: string;
  list: "college" | "branch" | "course";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const inputId = useId();
  const [options, setOptions] = useState<ComboBoxOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [picked, setPicked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = value.trim();
  const suppressed = picked || query.length === 0;

  useEffect(() => {
    if (suppressed) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/suggest?list=${list}&q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data = (await response.json()) as { options: ComboBoxOption[] };
        setOptions(data.options ?? []);
        setActiveIndex(-1);
      } catch {
        // aborted or offline; the field still accepts free text
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, list, suppressed]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function select(option: ComboBoxOption) {
    onChange(option.label);
    setPicked(true);
    setOpen(false);
  }

  const visibleOptions = suppressed ? [] : options;
  const showList = open && !suppressed && (visibleOptions.length > 0 || loading);

  return (
    <div ref={containerRef} className="relative">
      <FieldShell label={label} hint={hint} error={error} htmlFor={inputId}>
        <div className="relative">
          <input
            id={inputId}
            name={name}
            value={value}
            required={required}
            autoComplete="off"
            placeholder={placeholder}
            role="combobox"
            aria-expanded={showList}
            aria-controls={`${inputId}-listbox`}
            className={cn(inputClasses, error && "border-danger")}
            onChange={(event) => {
              onChange(event.target.value);
              setPicked(false);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (!showList) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => Math.min(index + 1, visibleOptions.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" && activeIndex >= 0) {
                event.preventDefault();
                select(visibleOptions[activeIndex]);
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          {loading ? (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-muted" />
          ) : null}
        </div>
      </FieldShell>

      {showList ? (
        <ul
          id={`${inputId}-listbox`}
          role="listbox"
          className="animate-fade-up absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg shadow-ink/5"
        >
          {visibleOptions.map((option, index) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(option)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm",
                  index === activeIndex ? "bg-brand-soft text-brand" : "text-ink",
                )}
              >
                <span className="truncate">{option.label}</span>
                {option.hint ? (
                  <span className="shrink-0 text-xs text-ink-muted">{option.hint}</span>
                ) : null}
              </button>
            </li>
          ))}
          {!loading && visibleOptions.length === 0 ? (
            <li className="flex items-center gap-2 px-3.5 py-2 text-xs text-ink-muted">
              <Check className="size-3.5" />
              Not in our list yet. We will save it for you.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
