import { MessageSquare, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Primitives";
import { formatRupees } from "@/lib/text";
import type { ListingCard as ListingCardData } from "@/server/services/ordering.service";

/**
 * One row on the Buy page and on the public landing search.
 * PRD section 4: initials avatar, course name, college short form, chat button.
 * Nothing that identifies the seller is ever rendered here.
 */
export function ListingCard({
  listing,
  action,
  soldOut,
}: {
  listing: ListingCardData;
  action?: React.ReactNode;
  soldOut?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5">
      <Avatar initials={listing.sellerInitials} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-ink">{listing.courseText}</p>
          {listing.isBoosted ? (
            <Zap className="size-3.5 shrink-0 text-brand" aria-label="Boosted listing" />
          ) : null}
        </div>
        <p className="mt-0.5 flex items-center gap-2 text-sm text-ink-muted">
          <span className="truncate">{listing.collegeAbbreviation}</span>
          <span aria-hidden>.</span>
          <span className="font-medium text-ink-soft">{formatRupees(listing.price)}</span>
        </p>
      </div>

      {soldOut ? (
        <Badge tone="neutral">Sold out</Badge>
      ) : (
        (action ?? (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm text-ink-muted">
            <MessageSquare className="size-4" />
            Chat
          </span>
        ))
      )}
    </li>
  );
}
