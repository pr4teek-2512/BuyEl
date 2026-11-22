"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

/**
 * The popup shell the app uses everywhere: a rounded box floating in the
 * middle of the screen, at every width, phones included. Never a sheet stuck
 * to an edge.
 *
 * Every popup in the app goes through this component, and any new one must
 * too, so they all look, scroll and close the same way. Do not hand roll an
 * overlay next to it.
 */
export function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="animate-fade-up my-auto max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl shadow-ink/10">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-ink-muted hover:text-ink"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
