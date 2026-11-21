import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { fetchListingPage } from "@/server/services/ordering.service";
import { existingThreadListingIds } from "@/server/services/chat.service";
import { EmptyState, PageHeading } from "@/components/ui/Primitives";
import { ListingCard } from "@/components/listing/ListingCard";
import { cn } from "@/lib/cn";
import { BuySearch } from "./BuySearch";
import { ChatButton } from "./ChatButton";

export const metadata = { title: "Buy - BuyEl" };

const TABS = [
  { key: "available", label: "Available" },
  { key: "soldout", label: "Sold Out" },
] as const;

export default async function BuyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; college?: string; course?: string; page?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const tab = TABS.find((t) => t.key === params.tab)?.key ?? "available";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  // PRD: the university filter defaults to the one picked at registration.
  const college = params.college ?? user.collegeText;
  const course = params.course ?? "";

  const { cards, total, hasMore } = await fetchListingPage(
    {
      status: tab === "available" ? "active" : "closed",
      collegeText: college,
      courseText: course || null,
      excludeSellerId: user.id,
    },
    page,
  );

  const openThreads = await existingThreadListingIds(
    user.id,
    cards.map((card) => card.id),
  );

  function hrefFor(next: Record<string, string | number>) {
    const query = new URLSearchParams({ tab });
    if (college) query.set("college", college);
    if (course) query.set("course", course);
    for (const [key, value] of Object.entries(next)) query.set(key, String(value));
    return `/buy?${query.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Buy" description="Course seats listed by other students." />

      <nav className="flex gap-1 border-b border-line">
        {TABS.map((item) => {
          const active = item.key === tab;
          const query = new URLSearchParams({ tab: item.key });
          if (college) query.set("college", college);
          if (course) query.set("course", course);

          return (
            <Link
              key={item.key}
              href={`/buy?${query.toString()}`}
              className={cn(
                "border-b-2 px-3 py-2 text-sm transition-colors",
                active
                  ? "border-brand font-medium text-brand"
                  : "border-transparent text-ink-soft hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <BuySearch
        tab={tab}
        defaultCollege={college}
        defaultCourse={course}
        homeCollege={user.collegeText}
      />

      {cards.length === 0 ? (
        <EmptyState
          title={tab === "available" ? "No listings here yet" : "Nothing sold out yet"}
          description={
            tab === "available"
              ? `Nobody has listed a course at ${college} that matches. Try another university, or list one yourself from the Sell tab.`
              : "Listings a seller has closed will show up here."
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {cards.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                soldOut={tab === "soldout"}
                action={
                  tab === "available" ? (
                    <ChatButton
                      listingId={listing.id}
                      alreadyOpen={openThreads.has(listing.id)}
                    />
                  ) : undefined
                }
              />
            ))}
          </ul>

          <div className="flex items-center justify-between text-sm text-ink-muted">
            <span>
              {total} {total === 1 ? "listing" : "listings"}
            </span>
            <span className="flex gap-3">
              {page > 1 ? (
                <Link className="text-brand hover:underline" href={hrefFor({ page: page - 1 })}>
                  Previous
                </Link>
              ) : null}
              {hasMore ? (
                <Link className="text-brand hover:underline" href={hrefFor({ page: page + 1 })}>
                  Next
                </Link>
              ) : null}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
