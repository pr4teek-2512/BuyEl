import "server-only";
import { prisma } from "@/server/db";
import { grantCredits } from "./credit.service";
import { writeAudit } from "./admin.service";
import {
  computeBoostWindow,
  isPlanPayable,
  requiresListing,
  targetTypeFor,
  validateTxnId,
} from "./payment.rules";

export class PaymentError extends Error {}

// ---------------------------------------------------------------------------
// What a student sees before paying
// ---------------------------------------------------------------------------

export async function listPayablePlans(category: "credits" | "seller_chat_unlock" | "boost") {
  const plans = await prisma.plan.findMany({
    where: { category, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
  });

  return plans.filter((plan) =>
    isPlanPayable({ price: plan.price, qrImageUrl: plan.qrImageUrl, isActive: plan.isActive }),
  );
}

export async function listActivePlatforms() {
  return prisma.paymentPlatform.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

// ---------------------------------------------------------------------------
// Submitting a payment
// ---------------------------------------------------------------------------

export type SubmitInput = {
  userId: string;
  planId: string;
  platformId: string;
  txnId: string;
  listingId?: string | null;
};

export async function submitPaymentRequest(input: SubmitInput) {
  const validated = validateTxnId(input.txnId);
  if (!validated.ok) throw new PaymentError(validated.error);

  const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
  if (!plan) throw new PaymentError("That plan is no longer available.");
  if (!isPlanPayable({ price: plan.price, qrImageUrl: plan.qrImageUrl, isActive: plan.isActive })) {
    throw new PaymentError("That plan is not available right now.");
  }

  const platform = await prisma.paymentPlatform.findUnique({ where: { id: input.platformId } });
  if (!platform || !platform.isActive) throw new PaymentError("Pick a payment app.");

  const targetType = targetTypeFor(plan.category);

  if (requiresListing(plan.category)) {
    if (!input.listingId) throw new PaymentError("That purchase needs a listing.");

    const listing = await prisma.listing.findUnique({
      where: { id: input.listingId },
      select: { sellerId: true, status: true, chatUnlockedAt: true },
    });

    if (!listing || listing.status === "deleted") {
      throw new PaymentError("That listing is no longer available.");
    }
    if (listing.sellerId !== input.userId) {
      throw new PaymentError("That listing is not yours.");
    }
    if (targetType === "listing_unlock" && listing.chatUnlockedAt) {
      throw new PaymentError("Chat is already unlocked for this listing.");
    }
  }

  const existing = await prisma.paymentRequest.findUnique({
    where: { txnId: validated.txnId },
  });

  if (existing) {
    // A student who mistyped and was rejected may correct and resubmit the
    // same reference. Anyone else reusing a reference is blocked.
    if (existing.userId === input.userId && existing.status === "rejected") {
      return prisma.paymentRequest.update({
        where: { id: existing.id },
        data: {
          planId: plan.id,
          platformId: platform.id,
          amount: plan.price,
          targetType,
          targetListingId: input.listingId ?? null,
          status: "pending",
          rejectReason: null,
          reviewedAt: null,
          reviewedByAdminId: null,
        },
      });
    }

    throw new PaymentError("That transaction ID has already been submitted.");
  }

  return prisma.paymentRequest.create({
    data: {
      userId: input.userId,
      planId: plan.id,
      platformId: platform.id,
      amount: plan.price,
      txnId: validated.txnId,
      targetType,
      targetListingId: input.listingId ?? null,
    },
  });
}

export async function listUserPayments(userId: string, take = 20) {
  return prisma.paymentRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    include: { plan: { select: { label: true, category: true } } },
  });
}

export async function pendingRequestFor(
  userId: string,
  targetType: "wallet" | "listing_unlock" | "listing_boost",
  listingId?: string,
) {
  return prisma.paymentRequest.findFirst({
    where: {
      userId,
      targetType,
      status: "pending",
      ...(listingId ? { targetListingId: listingId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Admin verification
// ---------------------------------------------------------------------------

export type PaymentListFilters = {
  search?: string;
  searchIn?: "phone" | "txn";
  status?: "pending" | "accepted" | "rejected";
  page?: number;
};

const PAGE_SIZE = 25;

export async function listPaymentRequests(filters: PaymentListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const search = filters.search?.trim();

  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(search
      ? filters.searchIn === "txn"
        ? { txnId: { contains: search, mode: "insensitive" as const } }
        : { user: { phone: { contains: search } } }
      : {}),
  };

  const [rows, total, pendingCount] = await Promise.all([
    prisma.paymentRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true, lastName: true, phone: true } },
        plan: { select: { label: true, category: true } },
        platform: { select: { name: true } },
        targetListing: { select: { courseText: true } },
      },
    }),
    prisma.paymentRequest.count({ where }),
    prisma.paymentRequest.count({ where: { status: "pending" } }),
  ]);

  return { rows, total, page, pageSize: PAGE_SIZE, pendingCount };
}

export async function countPendingPayments() {
  return prisma.paymentRequest.count({ where: { status: "pending" } });
}

/**
 * PRD section 6: accepting a payment unlocks whatever it was for. The grant
 * and the status change happen together, so a payment can never be marked
 * accepted without the student receiving what they paid for.
 */
export async function acceptPaymentRequest(adminUserId: string, requestId: string) {
  const request = await prisma.paymentRequest.findUnique({
    where: { id: requestId },
    include: { plan: true },
  });

  if (!request) throw new PaymentError("Payment request not found.");
  if (request.status !== "pending") {
    throw new PaymentError(`That request was already ${request.status}.`);
  }

  const now = new Date();

  if (request.targetType === "wallet") {
    const credits = request.plan?.creditsGranted ?? 0;
    if (credits < 1) throw new PaymentError("That plan has no credits configured.");

    await grantCredits(request.userId, credits, "purchase", request.id, `Payment ${request.txnId}`);
  }

  if (request.targetType === "listing_unlock") {
    if (!request.targetListingId) throw new PaymentError("That request has no listing.");
    await prisma.listing.update({
      where: { id: request.targetListingId },
      data: { chatUnlockedAt: now },
    });
  }

  if (request.targetType === "listing_boost") {
    if (!request.targetListingId) throw new PaymentError("That request has no listing.");

    const listing = await prisma.listing.findUnique({
      where: { id: request.targetListingId },
      select: { boostExpiresAt: true },
    });

    const days = request.plan?.boostDays ?? 0;
    if (days < 1) throw new PaymentError("That plan has no boost duration configured.");

    const window = computeBoostWindow(now, listing?.boostExpiresAt ?? null, days);

    await prisma.$transaction([
      prisma.listingBoost.create({
        data: {
          listingId: request.targetListingId,
          planId: request.planId,
          paymentRequestId: request.id,
          days,
          startsAt: window.startsAt,
          endsAt: window.endsAt,
        },
      }),
      prisma.listing.update({
        where: { id: request.targetListingId },
        data: {
          isBoosted: true,
          boostExpiresAt: window.endsAt,
          // Rule 5: a new boost goes to the top of the boosted bucket, and a
          // re-boost gets a fresh run at the chat threshold.
          boostOrderKey: now,
          pushedToBottomBoost: false,
        },
      }),
    ]);
  }

  const updated = await prisma.paymentRequest.update({
    where: { id: requestId },
    data: { status: "accepted", reviewedAt: now, reviewedByAdminId: adminUserId },
  });

  await prisma.notification.create({
    data: {
      userId: request.userId,
      type: "payment_accepted",
      title: "Payment approved",
      body: `Your payment of ${request.amount} rupees was verified and the feature is unlocked.`,
      refId: request.id,
    },
  });

  await writeAudit({
    adminUserId,
    action: "payment_accepted",
    entity: "payment_request",
    entityId: requestId,
    after: { txnId: request.txnId, amount: request.amount, targetType: request.targetType },
  });

  return updated;
}

export async function rejectPaymentRequest(
  adminUserId: string,
  requestId: string,
  reason: string,
) {
  const request = await prisma.paymentRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new PaymentError("Payment request not found.");
  if (request.status !== "pending") {
    throw new PaymentError(`That request was already ${request.status}.`);
  }

  const cleanReason = reason.trim() || "We could not verify that transaction.";

  const updated = await prisma.paymentRequest.update({
    where: { id: requestId },
    data: {
      status: "rejected",
      reviewedAt: new Date(),
      reviewedByAdminId: adminUserId,
      rejectReason: cleanReason,
    },
  });

  await prisma.notification.create({
    data: {
      userId: request.userId,
      type: "payment_rejected",
      title: "Payment request rejected",
      body: `${cleanReason} You can submit the correct transaction ID again.`,
      refId: request.id,
    },
  });

  await writeAudit({
    adminUserId,
    action: "payment_rejected",
    entity: "payment_request",
    entityId: requestId,
    after: { txnId: request.txnId, reason: cleanReason },
  });

  return updated;
}

/**
 * PRD section 8: a boost that has run out moves the listing back to the normal
 * list. Expiry is already honoured at read time, so this only tidies the flags
 * and notifies the seller. Safe to run as often as you like.
 */
export async function sweepExpiredBoosts() {
  const now = new Date();

  const expired = await prisma.listing.findMany({
    where: { isBoosted: true, boostExpiresAt: { lte: now } },
    select: { id: true, sellerId: true, courseText: true },
  });

  if (expired.length === 0) return 0;

  await prisma.listing.updateMany({
    where: { id: { in: expired.map((listing) => listing.id) } },
    data: { isBoosted: false, boostOrderKey: null, pushedToBottomBoost: false },
  });

  await prisma.notification.createMany({
    data: expired.map((listing) => ({
      userId: listing.sellerId,
      type: "boost_expired" as const,
      title: "Boost ended",
      body: `The boost on "${listing.courseText}" has ended. It is back in the normal list.`,
      refId: listing.id,
    })),
  });

  return expired.length;
}
