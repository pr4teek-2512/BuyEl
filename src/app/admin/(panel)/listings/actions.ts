"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireEditor } from "@/server/auth/adminSession";
import { writeAudit } from "@/server/services/admin.service";
import type { FormState } from "../master-lists/state";

const PAGE = "listings" as const;

function failure(error: unknown): FormState {
  if (error instanceof Error) {
    if (error.message === "ADMIN_FORBIDDEN") return { error: "You cannot edit this page." };
    if (error.message === "ADMIN_UNAUTHENTICATED") return { error: "Sign in again." };
    return { error: error.message };
  }
  return { error: "Something went wrong." };
}

/**
 * Moderation. An admin can close a listing without the seller having unlocked
 * chat, because this is a moderation action rather than a sale.
 */
export async function moderateListingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);
    const listingId = String(formData.get("listingId") ?? "");
    const intent = String(formData.get("intent") ?? "");

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return { error: "Listing not found." };

    const now = new Date();

    if (intent === "close") {
      await prisma.listing.update({
        where: { id: listingId },
        data: { status: "closed", closedAt: now },
      });
    } else if (intent === "reopen") {
      await prisma.listing.update({
        where: { id: listingId },
        data: { status: "active", closedAt: null, deletedAt: null },
      });
    } else if (intent === "delete") {
      await prisma.listing.update({
        where: { id: listingId },
        data: { status: "deleted", deletedAt: now },
      });
    } else {
      return { error: "Unknown action." };
    }

    await prisma.notification.create({
      data: {
        userId: listing.sellerId,
        type: "system",
        title: intent === "reopen" ? "Listing restored" : "Listing removed",
        body:
          intent === "reopen"
            ? `"${listing.courseText}" is active again.`
            : `"${listing.courseText}" was ${intent === "close" ? "closed" : "removed"} by the BuyEl team.`,
        refId: listing.id,
      },
    });

    await writeAudit({
      adminUserId: admin.id,
      action: `listing_${intent}`,
      entity: "listing",
      entityId: listingId,
      before: { status: listing.status, courseText: listing.courseText },
    });

    revalidatePath("/admin/listings");
    revalidatePath("/buy");

    return {
      success:
        intent === "reopen"
          ? "Listing is active again."
          : intent === "close"
            ? "Listing closed and the seller notified."
            : "Listing removed and the seller notified.",
    };
  } catch (error) {
    return failure(error);
  }
}
