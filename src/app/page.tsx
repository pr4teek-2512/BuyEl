import Link from "next/link";
import { ArrowRight, Lock, Search, Tag } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { fetchListingPage } from "@/server/services/ordering.service";
import { buildFeedFilters } from "@/server/services/ordering.rules";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Primitives";
import { ListingCard } from "@/components/listing/ListingCard";
import { PublicSearch } from "./PublicSearch";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ college?: string; course?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const college = params.college ?? "";
  const course = params.course ?? "";
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const searching = college.trim().length > 0 || course.trim().length > 0;

  // Exactly the same feed the Buy page uses, so results cannot drift apart.
  const results = searching
    ? await fetchListingPage(buildFeedFilters({ college, course, viewerId: user?.id }), page)
    : null;

  function hrefFor(nextPage: number) {
    const query = new URLSearchParams();
    if (college) query.set("college", college);
    if (course) query.set("course", course);
    query.set("page", String(nextPage));
    return `/?${query.toString()}#results`;
  }

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
        <section className="py-12 sm:py-16">
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            The course you wanted is already registered.
            <span className="text-brand"> By someone willing to let it go.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-ink-soft">
            BuyEl is a student marketplace for university course registrations. List a seat you
            secured, find the one you missed, and talk it through anonymously.
          </p>

          <div className="mt-8">
            <PublicSearch defaultCollege={college} defaultCourse={course} />
          </div>
        </section>

        {results ? (
          <section id="results" className="pb-12">
            <h2 className="mb-3 text-lg font-semibold">
              {results.total} {results.total === 1 ? "listing" : "listings"}
              {college ? ` at ${college}` : ""}
              {course ? ` for ${course}` : ""}
            </h2>

            {results.cards.length === 0 ? (
              <EmptyState
                title="Nothing listed yet"
                description="Nobody has put up that course. Try another college, or sign in and list it yourself."
                action={
                  <Link href="/login">
                    <Button size="sm">Sign in</Button>
                  </Link>
                }
              />
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {results.cards.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      action={
                        <Link href={user ? "/buy" : "/login"}>
                          <Button size="sm" variant="secondary">
                            {user ? "Open app" : "Sign in to chat"}
                          </Button>
                        </Link>
                      }
                    />
                  ))}
                </ul>

                <div className="mt-4 flex justify-end gap-3 text-sm">
                  {page > 1 ? (
                    <Link className="text-brand hover:underline" href={hrefFor(page - 1)}>
                      Previous
                    </Link>
                  ) : null}
                  {results.hasMore ? (
                    <Link className="text-brand hover:underline" href={hrefFor(page + 1)}>
                      Next
                    </Link>
                  ) : null}
                </div>
              </>
            )}
          </section>
        ) : (
          <section className="grid gap-4 pb-16 sm:grid-cols-3">
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
        )}

        {!searching ? (
          <div className="pb-16">
            <Link href={user ? "/buy" : "/login"}>
              <Button size="lg">
                {user ? "Go to listings" : "Get started"}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        ) : null}
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
