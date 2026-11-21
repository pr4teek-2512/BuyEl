"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Lock, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { Badge, Card } from "@/components/ui/Primitives";
import { cn } from "@/lib/cn";
import { listingActionHandler, updatePriceAction } from "./actions";
import { initialSellState } from "./state";

export type SellerListingView = {
  id: string;
  courseText: string;
  collegeText: string;
  collegeAbbreviation: string;
  price: number;
  status: "active" | "closed" | "deleted";
  chatUnlocked: boolean;
  isBoosted: boolean;
  boostExpiresLabel: string | null;
  distinctBuyerChatCount: number;
  createdLabel: string;
  rank: number | null;
};

function PendingButton({
  children,
  ...props
}: React.ComponentProps<typeof Button> & { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} loading={pending}>
      {children}
    </Button>
  );
}

export function SellListingCard({ listing }: { listing: SellerListingView }) {
  const [priceState, savePrice] = useActionState(updatePriceAction, initialSellState);
  const [actionState, runAction] = useActionState(listingActionHandler, initialSellState);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const feedback = priceState.error || priceState.success ? priceState : actionState;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{listing.courseText}</p>
            {listing.isBoosted ? (
              <Badge tone="brand">
                <Zap className="size-3" /> Boosted
              </Badge>
            ) : null}
            {listing.status === "closed" ? <Badge tone="neutral">Sold out</Badge> : null}
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">
            {listing.collegeAbbreviation} . listed {listing.createdLabel}
          </p>
        </div>

        {listing.status === "active" && listing.rank ? (
          <div className="rounded-xl bg-surface-soft px-3 py-1.5 text-right">
            <p className="text-[11px] uppercase tracking-wide text-ink-muted">Rank</p>
            <p className="text-sm font-semibold">#{listing.rank}</p>
          </div>
        ) : null}
      </div>

      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
        <div className="flex gap-1.5">
          <dt>College:</dt>
          <dd className="text-ink-soft">{listing.collegeText}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Buyers who started a chat:</dt>
          <dd className="text-ink-soft">{listing.distinctBuyerChatCount}</dd>
        </div>
        {listing.boostExpiresLabel ? (
          <div className="flex gap-1.5">
            <dt>Boost ends:</dt>
            <dd className="text-ink-soft">{listing.boostExpiresLabel}</dd>
          </div>
        ) : null}
      </dl>

      {listing.status !== "closed" ? (
        <form action={savePrice} className="flex items-end gap-2">
          <input type="hidden" name="listingId" value={listing.id} />
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-ink-soft">Price (rupees)</span>
            <input
              name="price"
              type="number"
              min={1}
              defaultValue={listing.price}
              className={cn(inputClasses)}
            />
          </label>
          <PendingButton type="submit" variant="secondary">
            Save price
          </PendingButton>
        </form>
      ) : (
        <p className="text-sm text-ink-soft">Sold at {listing.price} rupees.</p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        {listing.status === "active" ? (
          <>
            {listing.chatUnlocked ? (
              <form action={runAction}>
                <input type="hidden" name="listingId" value={listing.id} />
                <input type="hidden" name="intent" value="close" />
                <PendingButton type="submit" variant="secondary" size="sm">
                  Close listing
                </PendingButton>
              </form>
            ) : (
              <Button
                size="sm"
                disabled
                title="Paid unlock arrives with the payment step. Chat must be unlocked before a listing can be closed."
              >
                <Lock className="size-4" />
                Unlock chat
              </Button>
            )}

            <Button
              size="sm"
              variant="secondary"
              disabled
              title="Paid boost arrives with the payment step."
            >
              <Zap className="size-4" />
              Boost
            </Button>
          </>
        ) : (
          <form action={runAction}>
            <input type="hidden" name="listingId" value={listing.id} />
            <input type="hidden" name="intent" value="reopen" />
            <PendingButton type="submit" variant="secondary" size="sm">
              Reopen
            </PendingButton>
          </form>
        )}

        {confirmingDelete ? (
          <form action={runAction} className="flex items-center gap-2">
            <input type="hidden" name="listingId" value={listing.id} />
            <input type="hidden" name="intent" value="delete" />
            <span className="text-sm text-ink-soft">Delete permanently?</span>
            <PendingButton type="submit" variant="danger" size="sm">
              Yes, delete
            </PendingButton>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setConfirmingDelete(true)}
            className="ml-auto"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        )}
      </div>

      {feedback.error ? <p className="text-sm text-danger">{feedback.error}</p> : null}
      {feedback.success ? <p className="text-sm text-success">{feedback.success}</p> : null}
    </Card>
  );
}
