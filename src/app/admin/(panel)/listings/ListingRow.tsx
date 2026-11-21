"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Primitives";
import { moderateListingAction } from "./actions";
import { initialFormState } from "../master-lists/state";

export type AdminListingRow = {
  id: string;
  courseText: string;
  collegeText: string;
  sellerName: string;
  sellerPhone: string;
  price: number;
  status: "active" | "closed" | "deleted";
  isBoosted: boolean;
  chatUnlocked: boolean;
  chatCount: number;
  createdLabel: string;
};

function Pending({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} loading={pending}>
      {children}
    </Button>
  );
}

export function ListingRow({
  listing,
  editable,
}: {
  listing: AdminListingRow;
  editable: boolean;
}) {
  const [state, moderate] = useActionState(moderateListingAction, initialFormState);

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[12rem] flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            {listing.courseText}
            {listing.isBoosted ? <Zap className="size-3.5 text-brand" /> : null}
          </p>
          <p className="text-xs text-ink-muted">{listing.collegeText}</p>
        </div>

        <div className="min-w-[9rem]">
          <p className="text-sm">{listing.sellerName}</p>
          <p className="text-xs text-ink-muted">{listing.sellerPhone}</p>
        </div>

        <p className="text-sm font-semibold">Rs. {listing.price}</p>

        <p className="text-xs text-ink-muted">
          {listing.chatCount} chats . {listing.chatUnlocked ? "chat unlocked" : "chat locked"} .{" "}
          {listing.createdLabel}
        </p>

        <Badge
          tone={
            listing.status === "active"
              ? "success"
              : listing.status === "closed"
                ? "neutral"
                : "danger"
          }
        >
          {listing.status === "closed" ? "Sold out" : listing.status}
        </Badge>

        {editable ? (
          <form action={moderate} className="flex gap-2">
            <input type="hidden" name="listingId" value={listing.id} />
            {listing.status === "active" ? (
              <Pending type="submit" name="intent" value="close" size="sm" variant="secondary">
                Close
              </Pending>
            ) : (
              <Pending type="submit" name="intent" value="reopen" size="sm" variant="secondary">
                Reopen
              </Pending>
            )}
            {listing.status !== "deleted" ? (
              <Pending type="submit" name="intent" value="delete" size="sm" variant="danger">
                Remove
              </Pending>
            ) : null}
          </form>
        ) : null}
      </div>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
    </li>
  );
}
