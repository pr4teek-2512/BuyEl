/**
 * The listing ordering rules from PRD section 4, as pure functions.
 *
 * No database and no React here, so every rule is unit testable on its own.
 * `ordering.service.ts` turns these rules into the real queries.
 *
 *  1. Boosted listings always sit above non boosted ones.
 *  2. Inside the boosted bucket, the most recent boost is first (key DESC).
 *  3. Inside the normal bucket, the oldest is on top, so a new listing lands at
 *     the very bottom (key ASC).
 *  4. A new listing sets normalOrderKey = now.
 *  5. A new boost sets boostOrderKey = now.
 *  6. A normal listing that reaches 3 distinct buyer chats drops to the bottom
 *     of the normal bucket, once.
 *  7. A boosted listing that reaches 4 distinct buyer chats drops to the bottom
 *     of the boosted bucket, once.
 *  8. Chats never move a listing between buckets.
 *  9. Boost expiry is decided at read time.
 * 10. The rank shown to a seller is this same order, filtered to that listing's
 *     own college.
 */

export const NORMAL_CHAT_THRESHOLD = 3;
export const BOOSTED_CHAT_THRESHOLD = 4;

export type OrderableListing = {
  id: string;
  isBoosted: boolean;
  boostExpiresAt: Date | null;
  boostOrderKey: Date | null;
  normalOrderKey: Date;
  distinctBuyerChatCount: number;
  pushedToBottomNormal: boolean;
  pushedToBottomBoost: boolean;
};

/** Rule 1 and rule 9: a boost only counts while it has not expired. */
export function isBoostedNow(listing: OrderableListing, now: Date = new Date()): boolean {
  return (
    listing.isBoosted &&
    listing.boostExpiresAt !== null &&
    listing.boostExpiresAt.getTime() > now.getTime()
  );
}

/**
 * Rules 1 to 3 as a comparator. Returns a negative number when `a` should be
 * displayed above `b`.
 */
export function compareListings(
  a: OrderableListing,
  b: OrderableListing,
  now: Date = new Date(),
): number {
  const aBoosted = isBoostedNow(a, now);
  const bBoosted = isBoostedNow(b, now);

  if (aBoosted !== bBoosted) return aBoosted ? -1 : 1;

  if (aBoosted) {
    // Newest boost first.
    const aKey = a.boostOrderKey?.getTime() ?? 0;
    const bKey = b.boostOrderKey?.getTime() ?? 0;
    if (aKey !== bKey) return bKey - aKey;
    return a.id.localeCompare(b.id);
  }

  // Oldest first, so the newest listing is at the very bottom.
  const aKey = a.normalOrderKey.getTime();
  const bKey = b.normalOrderKey.getTime();
  if (aKey !== bKey) return aKey - bKey;
  return a.id.localeCompare(b.id);
}

export function sortListings<T extends OrderableListing>(
  listings: T[],
  now: Date = new Date(),
): T[] {
  return [...listings].sort((a, b) => compareListings(a, b, now));
}

export type PushDecision =
  | { push: false }
  | { push: true; bucket: "normal" | "boosted" };

/**
 * Rules 6, 7 and 8. Called after a new buyer opens a chat on this listing.
 * The listing never changes bucket, and each bucket pushes at most once.
 */
export function decidePushToBottom(
  listing: OrderableListing,
  now: Date = new Date(),
): PushDecision {
  if (isBoostedNow(listing, now)) {
    if (listing.pushedToBottomBoost) return { push: false };
    if (listing.distinctBuyerChatCount < BOOSTED_CHAT_THRESHOLD) return { push: false };
    return { push: true, bucket: "boosted" };
  }

  if (listing.pushedToBottomNormal) return { push: false };
  if (listing.distinctBuyerChatCount < NORMAL_CHAT_THRESHOLD) return { push: false };
  return { push: true, bucket: "normal" };
}

/**
 * One page of results spans two buckets that are queried separately, because
 * they sort in opposite directions. This works out how much to take from each.
 */
export type PagePlan = {
  boostedSkip: number;
  boostedTake: number;
  normalSkip: number;
  normalTake: number;
};

export function planPage(
  boostedCount: number,
  offset: number,
  limit: number,
): PagePlan {
  const boostedSkip = Math.min(offset, boostedCount);
  const boostedTake = Math.max(0, Math.min(limit, boostedCount - boostedSkip));
  const normalSkip = Math.max(0, offset - boostedCount);
  const normalTake = Math.max(0, limit - boostedTake);

  return { boostedSkip, boostedTake, normalSkip, normalTake };
}

/**
 * Rule 10. Given how many listings sort above this one inside its own college,
 * the displayed rank is simply that count plus one.
 */
export function rankFromAboveCount(aboveCount: number): number {
  return aboveCount + 1;
}
