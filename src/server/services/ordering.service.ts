import "server-only";
import { prisma } from "@/server/db";
import { initials, normalizeName } from "@/lib/text";
import { decidePushToBottom, planPage, rankFromAboveCount } from "./ordering.rules";
import type { Prisma } from "@/generated/prisma/client";

/**
 * The one place listings are read in display order. The Buy page and the public
 * landing search both call `fetchListingPage`, which is what PRD section 14
 * means by the two surfaces using the same data and the same sorting.
 */

export type ListingFilters = {
  /** Match a college by id when it is official, or by its free text otherwise. */
  collegeId?: string | null;
  collegeText?: string | null;
  courseId?: string | null;
  courseText?: string | null;
  status?: "active" | "closed";
  /** Excluded so a seller never sees their own listing on the Buy page. */
  excludeSellerId?: string;
};

export type ListingCard = {
  id: string;
  courseText: string;
  collegeText: string;
  collegeAbbreviation: string;
  price: number;
  sellerInitials: string;
  sellerId: string;
  isBoosted: boolean;
  createdAt: Date;
  chatUnlocked: boolean;
};

export const LISTINGS_PER_PAGE = 20;

/**
 * Filtering by college text cannot use an index, so a typed college name is
 * resolved to its official id first. Measured on 5,000 listings this is the
 * difference between scanning the whole active set and a single index scan.
 * A college that is not in the master list yet still falls back to text.
 */
async function resolveCollegeScope(
  filters: ListingFilters,
): Promise<{ collegeId?: string; collegeText?: string }> {
  if (filters.collegeId) return { collegeId: filters.collegeId };

  const text = filters.collegeText?.trim();
  if (!text) return {};

  const official = await prisma.college.findUnique({
    where: { normalizedName: normalizeName(text) },
    select: { id: true },
  });

  if (official) return { collegeId: official.id };

  const byAbbreviation = await prisma.college.findFirst({
    where: { abbreviation: { equals: text, mode: "insensitive" } },
    select: { id: true },
  });

  return byAbbreviation ? { collegeId: byAbbreviation.id } : { collegeText: text };
}

function baseWhere(filters: ListingFilters, now: Date): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {
    status: filters.status ?? "active",
  };

  if (filters.excludeSellerId) {
    where.sellerId = { not: filters.excludeSellerId };
  }

  if (filters.collegeId) {
    where.collegeId = filters.collegeId;
  } else if (filters.collegeText?.trim()) {
    where.collegeText = { equals: filters.collegeText.trim(), mode: "insensitive" };
  }

  if (filters.courseId) {
    where.courseId = filters.courseId;
  } else if (filters.courseText?.trim()) {
    where.courseText = { contains: filters.courseText.trim(), mode: "insensitive" };
  }

  void now;
  return where;
}

/** Rule 1 and rule 9 expressed as a query fragment. */
function boostedWhere(now: Date): Prisma.ListingWhereInput {
  return { isBoosted: true, boostExpiresAt: { gt: now } };
}

function normalWhere(now: Date): Prisma.ListingWhereInput {
  return {
    OR: [
      { isBoosted: false },
      { boostExpiresAt: null },
      { boostExpiresAt: { lte: now } },
    ],
  };
}

const CARD_SELECT = {
  id: true,
  courseText: true,
  collegeText: true,
  price: true,
  sellerId: true,
  isBoosted: true,
  boostExpiresAt: true,
  createdAt: true,
  chatUnlockedAt: true,
  college: { select: { abbreviation: true } },
  seller: { select: { name: true, lastName: true } },
} satisfies Prisma.ListingSelect;

type CardRow = Prisma.ListingGetPayload<{ select: typeof CARD_SELECT }>;

function toCard(row: CardRow, now: Date): ListingCard {
  return {
    id: row.id,
    courseText: row.courseText,
    collegeText: row.collegeText,
    // Falls back to the free text when the college is not official yet.
    collegeAbbreviation: row.college?.abbreviation ?? row.collegeText,
    price: row.price,
    sellerId: row.sellerId,
    sellerInitials: initials(row.seller.name, row.seller.lastName),
    isBoosted: row.isBoosted && row.boostExpiresAt !== null && row.boostExpiresAt > now,
    createdAt: row.createdAt,
    chatUnlocked: row.chatUnlockedAt !== null,
  };
}

export async function fetchListingPage(
  filters: ListingFilters,
  page = 1,
  perPage = LISTINGS_PER_PAGE,
) {
  const now = new Date();
  const scope = await resolveCollegeScope(filters);
  const where = baseWhere({ ...filters, ...scope, collegeText: scope.collegeText ?? null }, now);
  const offset = (page - 1) * perPage;

  const [boostedCount, normalCount] = await Promise.all([
    prisma.listing.count({ where: { AND: [where, boostedWhere(now)] } }),
    prisma.listing.count({ where: { AND: [where, normalWhere(now)] } }),
  ]);

  const plan = planPage(boostedCount, offset, perPage);

  const [boostedRows, normalRows] = await Promise.all([
    plan.boostedTake > 0
      ? prisma.listing.findMany({
          where: { AND: [where, boostedWhere(now)] },
          // Rule 2: newest boost first.
          orderBy: [{ boostOrderKey: "desc" }, { id: "asc" }],
          skip: plan.boostedSkip,
          take: plan.boostedTake,
          select: CARD_SELECT,
        })
      : Promise.resolve([] as CardRow[]),
    plan.normalTake > 0
      ? prisma.listing.findMany({
          where: { AND: [where, normalWhere(now)] },
          // Rule 3: oldest first, so a new listing is at the very bottom.
          orderBy: [{ normalOrderKey: "asc" }, { id: "asc" }],
          skip: plan.normalSkip,
          take: plan.normalTake,
          select: CARD_SELECT,
        })
      : Promise.resolve([] as CardRow[]),
  ]);

  const total = boostedCount + normalCount;

  return {
    cards: [...boostedRows, ...normalRows].map((row) => toCard(row, now)),
    total,
    page,
    perPage,
    hasMore: offset + perPage < total,
  };
}

/**
 * Rule 10. The position of one listing inside its own college, using the same
 * ordering the Buy page uses.
 */
export async function rankWithinCollege(listingId: string): Promise<number | null> {
  const now = new Date();
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      status: true,
      collegeId: true,
      collegeText: true,
      isBoosted: true,
      boostExpiresAt: true,
      boostOrderKey: true,
      normalOrderKey: true,
    },
  });

  if (!listing || listing.status !== "active") return null;

  const collegeScope: Prisma.ListingWhereInput = listing.collegeId
    ? { collegeId: listing.collegeId }
    : { collegeText: { equals: listing.collegeText, mode: "insensitive" } };

  const scope: Prisma.ListingWhereInput = { AND: [{ status: "active" }, collegeScope] };
  const live = listing.isBoosted && listing.boostExpiresAt !== null && listing.boostExpiresAt > now;

  if (live) {
    const above = await prisma.listing.count({
      where: {
        AND: [scope, boostedWhere(now), { boostOrderKey: { gt: listing.boostOrderKey ?? now } }],
      },
    });
    return rankFromAboveCount(above);
  }

  const [boostedAbove, normalAbove] = await Promise.all([
    prisma.listing.count({ where: { AND: [scope, boostedWhere(now)] } }),
    prisma.listing.count({
      where: {
        AND: [scope, normalWhere(now), { normalOrderKey: { lt: listing.normalOrderKey } }],
      },
    }),
  ]);

  return rankFromAboveCount(boostedAbove + normalAbove);
}

/**
 * Rules 4 to 8, applied after a new buyer opens a chat on this listing.
 * Phase 4 calls this inside the same transaction that spends the credit.
 */
export async function applyChatThreshold(listingId: string) {
  const now = new Date();
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      isBoosted: true,
      boostExpiresAt: true,
      boostOrderKey: true,
      normalOrderKey: true,
      distinctBuyerChatCount: true,
      pushedToBottomNormal: true,
      pushedToBottomBoost: true,
    },
  });

  if (!listing) return;

  const decision = decidePushToBottom(listing, now);
  if (!decision.push) return;

  if (decision.bucket === "normal") {
    await prisma.listing.update({
      where: { id: listingId },
      data: { normalOrderKey: now, pushedToBottomNormal: true },
    });
    return;
  }

  // Bottom of the boosted bucket means just below the current oldest boost.
  const oldest = await prisma.listing.findFirst({
    where: { AND: [{ status: "active" }, boostedWhere(now)] },
    orderBy: { boostOrderKey: "asc" },
    select: { boostOrderKey: true },
  });

  const bottomKey = new Date((oldest?.boostOrderKey ?? now).getTime() - 1000);

  await prisma.listing.update({
    where: { id: listingId },
    data: { boostOrderKey: bottomKey, pushedToBottomBoost: true },
  });
}
