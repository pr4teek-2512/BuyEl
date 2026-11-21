import "server-only";
import { prisma } from "@/server/db";
import { resolveCollege, resolveCourse } from "./masterlist.service";
import { rankWithinCollege } from "./ordering.service";
import { initials } from "@/lib/text";

export type CreateListingInput = {
  sellerId: string;
  courseName: string;
  collegeName: string;
  price: number;
};

/** PRD section 7: creating a listing is always free. */
export async function createListing(input: CreateListingInput) {
  const courseName = input.courseName.trim();
  const collegeName = input.collegeName.trim();

  if (courseName.length < 2) throw new Error("Enter the course name.");
  if (collegeName.length < 2) throw new Error("Enter the college name.");
  if (!Number.isInteger(input.price) || input.price < 1) {
    throw new Error("Enter a price of at least 1 rupee.");
  }
  if (input.price > 1_000_000) throw new Error("That price looks too high.");

  const college = await resolveCollege(collegeName, input.sellerId);
  const course = await resolveCourse(courseName, {
    userId: input.sellerId,
    collegeId: college.id,
  });

  const now = new Date();

  const listing = await prisma.listing.create({
    data: {
      sellerId: input.sellerId,
      courseId: course.id,
      courseText: course.text,
      collegeId: college.id,
      collegeText: college.text,
      price: input.price,
      // Rule 4: a new listing goes to the very bottom of the normal bucket.
      normalOrderKey: now,
    },
  });

  // Attribute any master list request raised above to this listing.
  await prisma.masterListRequest.updateMany({
    where: {
      status: "pending",
      listingId: null,
      listType: "course",
      submittedText: course.text,
    },
    data: { listingId: listing.id },
  });

  return listing;
}

/** PRD section 7: the price may change at any time, the names never. */
export async function updateListingPrice(sellerId: string, listingId: string, price: number) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== sellerId) throw new Error("Listing not found.");
  if (listing.status === "deleted") throw new Error("That listing was deleted.");
  if (!Number.isInteger(price) || price < 1) throw new Error("Enter a price of at least 1 rupee.");
  if (price > 1_000_000) throw new Error("That price looks too high.");

  return prisma.listing.update({ where: { id: listingId }, data: { price } });
}

/**
 * PRD section 7: a seller must unlock chat for a listing before closing it,
 * so the Close button only appears once Unlock Chat has been paid for.
 */
export async function closeListing(sellerId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== sellerId) throw new Error("Listing not found.");
  if (listing.status !== "active") throw new Error("That listing is not active.");
  if (!listing.chatUnlockedAt) {
    throw new Error("Unlock chat for this listing before closing it.");
  }

  return prisma.listing.update({
    where: { id: listingId },
    data: { status: "closed", closedAt: new Date() },
  });
}

export async function reopenListing(sellerId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== sellerId) throw new Error("Listing not found.");
  if (listing.status !== "closed") throw new Error("That listing is not closed.");

  return prisma.listing.update({
    where: { id: listingId },
    data: { status: "active", closedAt: null },
  });
}

/**
 * Soft delete. The PRD says a deleted listing leaves both tabs, and the rows
 * are kept so existing conversations and payment history stay readable.
 */
export async function deleteListing(sellerId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== sellerId) throw new Error("Listing not found.");

  return prisma.listing.update({
    where: { id: listingId },
    data: { status: "deleted", deletedAt: new Date() },
  });
}

export type SellerListing = {
  id: string;
  courseText: string;
  collegeText: string;
  collegeAbbreviation: string;
  price: number;
  status: "active" | "closed" | "deleted";
  chatUnlocked: boolean;
  isBoosted: boolean;
  boostExpiresAt: Date | null;
  distinctBuyerChatCount: number;
  createdAt: Date;
  rank: number | null;
  sellerInitials: string;
};

export async function listSellerListings(sellerId: string): Promise<SellerListing[]> {
  const now = new Date();

  const rows = await prisma.listing.findMany({
    where: { sellerId, status: { in: ["active", "closed"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      courseText: true,
      collegeText: true,
      price: true,
      status: true,
      chatUnlockedAt: true,
      isBoosted: true,
      boostExpiresAt: true,
      distinctBuyerChatCount: true,
      createdAt: true,
      college: { select: { abbreviation: true } },
      seller: { select: { name: true, lastName: true } },
    },
  });

  // Rule 10: the rank each listing holds inside its own college.
  const ranks = await Promise.all(
    rows.map((row) => (row.status === "active" ? rankWithinCollege(row.id) : Promise.resolve(null))),
  );

  return rows.map((row, index) => ({
    id: row.id,
    courseText: row.courseText,
    collegeText: row.collegeText,
    collegeAbbreviation: row.college?.abbreviation ?? row.collegeText,
    price: row.price,
    status: row.status as SellerListing["status"],
    chatUnlocked: row.chatUnlockedAt !== null,
    isBoosted: row.isBoosted && row.boostExpiresAt !== null && row.boostExpiresAt > now,
    boostExpiresAt: row.boostExpiresAt,
    distinctBuyerChatCount: row.distinctBuyerChatCount,
    createdAt: row.createdAt,
    rank: ranks[index],
    sellerInitials: initials(row.seller.name, row.seller.lastName),
  }));
}
