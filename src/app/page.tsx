import Link from "next/link";
import { ArrowRight, Lock, Search, Tag } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Primitives";

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight">
            Buy<span className="text-brand">El</span>
          </span>
          <Link href={user ? "/buy" : "/login"}>
            <Button size="sm">{user ? "Open app" : "Sign in"}</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <section className="py-16 sm:py-24">
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            The course you wanted is already registered.
            <span className="text-brand"> By someone willing to let it go.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-ink-soft">
            BuyEl is a student marketplace for university course registrations. List a seat you
            secured, find the one you missed, and talk it through anonymously.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={user ? "/buy" : "/login"}>
              <Button size="lg">
                {user ? "Go to listings" : "Get started"}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-3">
          <Card>
            <Tag className="size-5 text-brand" />
            <p className="mt-3 font-medium">Listing is free</p>
            <p className="mt-1 text-sm text-ink-muted">
              Put up a course in seconds. You only pay when you want to be found faster or to
              reply to buyers.
            </p>
          </Card>
          <Card>
            <Search className="size-5 text-brand" />
            <p className="mt-3 font-medium">Search your campus</p>
            <p className="mt-1 text-sm text-ink-muted">
              Filter by university and course. Your own university is selected for you once you
              sign in.
            </p>
          </Card>
          <Card>
            <Lock className="size-5 text-brand" />
            <p className="mt-3 font-medium">Nobody sees your name</p>
            <p className="mt-1 text-sm text-ink-muted">
              Buyers and sellers only ever see two initials. No names, no numbers, no profiles.
            </p>
          </Card>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-ink-muted">
          BuyEl is a listing and communication service. Seats are arranged between students
          directly.
        </div>
      </footer>
    </div>
  );
}
