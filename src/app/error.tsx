"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg font-semibold tracking-tight">
        Buy<span className="text-brand">El</span>
      </p>
      <h1 className="text-xl font-semibold">Something went wrong at our end</h1>
      <p className="text-sm text-ink-muted">
        Nothing you did caused this. Try again, and if it keeps happening let us know.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-ink-muted">Reference {error.digest}</p>
      ) : null}
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
