import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg font-semibold tracking-tight">
        Buy<span className="text-brand">El</span>
      </p>
      <h1 className="text-xl font-semibold">We could not find that page</h1>
      <p className="text-sm text-ink-muted">
        The link may be old, or the listing may have been taken down.
      </p>
      <Link href="/buy">
        <Button>Go to listings</Button>
      </Link>
    </main>
  );
}
