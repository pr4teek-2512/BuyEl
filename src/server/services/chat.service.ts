import "server-only";
import { prisma } from "@/server/db";
import { debitOneCredit, InsufficientCreditsError } from "./credit.service";
import { applyChatThreshold } from "./ordering.service";
import {
  compareThreads,
  isLockedFor,
  toThreadView,
  validateMessage,
  type ThreadSource,
  type ThreadView,
  type ViewerRole,
} from "./chat.rules";

export class ChatError extends Error {}

const THREAD_SELECT = {
  id: true,
  listingId: true,
  buyerId: true,
  sellerId: true,
  lastMessageAt: true,
  buyerLastReadAt: true,
  sellerLastReadAt: true,
  listing: { select: { courseText: true, chatUnlockedAt: true } },
  buyer: { select: { name: true, lastName: true } },
  seller: { select: { name: true, lastName: true } },
  messages: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { body: true },
  },
} as const;

type ThreadRow = {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessageAt: Date | null;
  buyerLastReadAt: Date | null;
  sellerLastReadAt: Date | null;
  listing: { courseText: string; chatUnlockedAt: Date | null };
  buyer: { name: string; lastName: string | null };
  seller: { name: string; lastName: string | null };
  messages: { body: string }[];
};

function toSource(row: ThreadRow): ThreadSource {
  return {
    id: row.id,
    listingId: row.listingId,
    courseText: row.listing.courseText,
    buyer: row.buyer,
    seller: row.seller,
    lastMessageAt: row.lastMessageAt,
    buyerLastReadAt: row.buyerLastReadAt,
    sellerLastReadAt: row.sellerLastReadAt,
    lastMessageBody: row.messages[0]?.body ?? null,
    sellerUnlocked: row.listing.chatUnlockedAt !== null,
  };
}

export type OpenChatResult =
  | { ok: true; threadId: string; charged: boolean; balance?: number }
  | { ok: false; reason: "insufficient_credits" | "invalid" ; error: string };

/**
 * PRD section 5, with the owner's decision of 2026-11-21: one credit per
 * listing. Re-entering a conversation you already paid for is free, and the
 * experience is identical whether or not the seller has unlocked chat.
 *
 * The whole thing is one transaction, so a buyer can never be charged for a
 * conversation that was not created, and never charged twice for the same one.
 */
export async function openChat(buyerId: string, listingId: string): Promise<OpenChatResult> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true, status: true },
  });

  if (!listing || listing.status === "deleted") {
    return { ok: false, reason: "invalid", error: "That listing is no longer available." };
  }
  if (listing.sellerId === buyerId) {
    return { ok: false, reason: "invalid", error: "This is your own listing." };
  }

  const existing = await prisma.chatThread.findUnique({
    where: { listingId_buyerId: { listingId, buyerId } },
    select: { id: true },
  });

  if (existing) {
    // Already paid for. Opening it again costs nothing.
    return { ok: true, threadId: existing.id, charged: false };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const thread = await tx.chatThread.create({
        data: { listingId, buyerId, sellerId: listing.sellerId },
        select: { id: true },
      });

      const balance = await debitOneCredit(tx, buyerId, "chat_open", thread.id);

      await tx.chatThread.update({
        where: { id: thread.id },
        data: { buyerCreditEntryId: thread.id },
      });

      // The chat count is per distinct buyer, which the unique constraint on
      // (listingId, buyerId) already guarantees.
      await tx.listing.update({
        where: { id: listingId },
        data: { distinctBuyerChatCount: { increment: 1 } },
      });

      return { threadId: thread.id, balance };
    });

    // Rules 6 to 8: may move the listing to the bottom of its own bucket.
    await applyChatThreshold(listingId);

    return { ok: true, threadId: result.threadId, charged: true, balance: result.balance };
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return { ok: false, reason: "insufficient_credits", error: error.message };
    }

    // A racing duplicate lost the unique constraint, so the other one paid.
    const raced = await prisma.chatThread.findUnique({
      where: { listingId_buyerId: { listingId, buyerId } },
      select: { id: true },
    });
    if (raced) return { ok: true, threadId: raced.id, charged: false };

    throw error;
  }
}

/** Which of these listings this buyer has already paid to open. */
export async function existingThreadListingIds(
  buyerId: string,
  listingIds: string[],
): Promise<Set<string>> {
  if (listingIds.length === 0) return new Set();

  const rows = await prisma.chatThread.findMany({
    where: { buyerId, listingId: { in: listingIds } },
    select: { listingId: true },
  });

  return new Set(rows.map((row) => row.listingId));
}

export async function listThreads(userId: string, role: ViewerRole): Promise<ThreadView[]> {
  const rows = (await prisma.chatThread.findMany({
    where: role === "buyer" ? { buyerId: userId } : { sellerId: userId },
    select: THREAD_SELECT,
  })) as unknown as ThreadRow[];

  return rows.map(toSource).sort(compareThreads).map((source) => toThreadView(source, role));
}

export async function countUnread(userId: string): Promise<number> {
  const [asBuyer, asSeller] = await Promise.all([
    listThreads(userId, "buyer"),
    listThreads(userId, "seller"),
  ]);

  return [...asBuyer, ...asSeller].filter((thread) => thread.unread).length;
}

export type ConversationMessage = {
  id: string;
  mine: boolean;
  body: string;
  createdAt: string;
};

export type Conversation = {
  view: ThreadView;
  role: ViewerRole;
  listingId: string;
  waitingMessageCount: number;
  messages: ConversationMessage[];
};

async function loadThread(userId: string, threadId: string) {
  const row = (await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: THREAD_SELECT,
  })) as unknown as ThreadRow | null;

  if (!row) throw new ChatError("Conversation not found.");
  if (row.buyerId !== userId && row.sellerId !== userId) {
    throw new ChatError("Conversation not found.");
  }

  const role: ViewerRole = row.buyerId === userId ? "buyer" : "seller";
  return { row, role };
}

export async function getConversation(userId: string, threadId: string): Promise<Conversation> {
  const { row, role } = await loadThread(userId, threadId);
  const source = toSource(row);
  const locked = isLockedFor(source, role);

  if (locked) {
    // A seller who has not unlocked this listing sees how many people are
    // waiting, and nothing they wrote.
    const waiting = await prisma.message.count({
      where: { threadId, senderRole: "buyer" },
    });

    return {
      view: toThreadView(source, role),
      role,
      listingId: row.listingId,
      waitingMessageCount: waiting,
      messages: [],
    };
  }

  const messages = await prisma.message.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, senderRole: true, body: true, createdAt: true },
  });

  await prisma.chatThread.update({
    where: { id: threadId },
    data: role === "buyer" ? { buyerLastReadAt: new Date() } : { sellerLastReadAt: new Date() },
  });

  return {
    view: toThreadView(source, role),
    role,
    listingId: row.listingId,
    waitingMessageCount: 0,
    messages: messages.map((message) => ({
      id: message.id,
      mine: message.senderRole === role,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

export async function sendMessage(userId: string, threadId: string, body: string) {
  const { row, role } = await loadThread(userId, threadId);
  const source = toSource(row);

  if (isLockedFor(source, role)) {
    throw new ChatError("Unlock chat for this listing before you can reply.");
  }

  const validated = validateMessage(body);
  if (!validated.ok) throw new ChatError(validated.error);

  const now = new Date();

  await prisma.$transaction([
    prisma.message.create({
      data: { threadId, senderRole: role, body: validated.body },
    }),
    prisma.chatThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: now,
        ...(role === "buyer" ? { buyerLastReadAt: now } : { sellerLastReadAt: now }),
      },
    }),
  ]);
}

/** Polling endpoint support: everything newer than the last message the client holds. */
export async function messagesSince(userId: string, threadId: string, afterIso?: string) {
  const { row, role } = await loadThread(userId, threadId);
  const source = toSource(row);
  if (isLockedFor(source, role)) return [];

  const after = afterIso ? new Date(afterIso) : undefined;

  const messages = await prisma.message.findMany({
    where: { threadId, ...(after ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, senderRole: true, body: true, createdAt: true },
  });

  if (messages.length > 0) {
    await prisma.chatThread.update({
      where: { id: threadId },
      data: role === "buyer" ? { buyerLastReadAt: new Date() } : { sellerLastReadAt: new Date() },
    });
  }

  return messages.map((message) => ({
    id: message.id,
    mine: message.senderRole === role,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  }));
}
