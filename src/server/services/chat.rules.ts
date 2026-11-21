/**
 * Chat rules from PRD section 9, as pure functions.
 *
 * The important one is anonymity: a buyer and a seller must never learn each
 * other's name, phone number or anything else. All either side ever receives
 * is the course name and two initials.
 */

import { initials } from "@/lib/text";

export type ViewerRole = "buyer" | "seller";

export type ThreadParticipant = {
  name: string;
  lastName: string | null;
};

export type ThreadSource = {
  id: string;
  listingId: string;
  courseText: string;
  buyer: ThreadParticipant;
  seller: ThreadParticipant;
  lastMessageAt: Date | null;
  buyerLastReadAt: Date | null;
  sellerLastReadAt: Date | null;
  lastMessageBody: string | null;
  /** Whether the seller has paid to unlock chat on this listing. */
  sellerUnlocked: boolean;
};

/**
 * What a participant is allowed to see about a conversation. Deliberately has
 * no field that could carry a name, a phone number or a user id of the other
 * party, so an identity leak cannot happen by accident downstream.
 */
export type ThreadView = {
  id: string;
  courseText: string;
  counterpartInitials: string;
  lastMessagePreview: string | null;
  unread: boolean;
  locked: boolean;
};

export function counterpartOf(thread: ThreadSource, viewer: ViewerRole): ThreadParticipant {
  return viewer === "buyer" ? thread.seller : thread.buyer;
}

/** A conversation is unread when the other side wrote after your last visit. */
export function isUnread(thread: ThreadSource, viewer: ViewerRole): boolean {
  if (!thread.lastMessageAt) return false;

  const lastRead = viewer === "buyer" ? thread.buyerLastReadAt : thread.sellerLastReadAt;
  if (!lastRead) return true;

  return thread.lastMessageAt.getTime() > lastRead.getTime();
}

/**
 * PRD section 5: a seller must unlock chat for each listing before they can
 * read and reply. A buyer is never locked out once they have spent the credit.
 */
export function isLockedFor(thread: ThreadSource, viewer: ViewerRole): boolean {
  return viewer === "seller" && !thread.sellerUnlocked;
}

export function toThreadView(thread: ThreadSource, viewer: ViewerRole): ThreadView {
  const other = counterpartOf(thread, viewer);
  const locked = isLockedFor(thread, viewer);

  return {
    id: thread.id,
    courseText: thread.courseText,
    counterpartInitials: initials(other.name, other.lastName),
    // A locked seller does not get to read the message, not even a preview.
    lastMessagePreview: locked ? null : thread.lastMessageBody,
    unread: isUnread(thread, viewer),
    locked,
  };
}

/** Most recently active conversation first, then newest thread. */
export function compareThreads(a: ThreadSource, b: ThreadSource): number {
  const aTime = a.lastMessageAt?.getTime() ?? 0;
  const bTime = b.lastMessageAt?.getTime() ?? 0;
  if (aTime !== bTime) return bTime - aTime;
  return b.id.localeCompare(a.id);
}

export const MAX_MESSAGE_LENGTH = 2000;

export function validateMessage(body: string): { ok: true; body: string } | { ok: false; error: string } {
  const trimmed = body.trim();
  if (trimmed.length === 0) return { ok: false, error: "Type a message first." };
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Keep it under ${MAX_MESSAGE_LENGTH} characters.` };
  }
  return { ok: true, body: trimmed };
}
