import "server-only";
import { prisma } from "@/server/db";
import {
  CHAT_LIST_LIMIT,
  MESSAGES_PER_THREAD,
  inactiveBefore,
} from "./retention.rules";

/**
 * The daily chat cleanup. Both rules live in `retention.rules.ts`; this file
 * is only the queries that carry them out.
 *
 * Everything here is a hard delete. Messages are removed with the thread by
 * the cascade on `messages.thread_id`, so a swept chat leaves nothing behind.
 */

export type RetentionReport = {
  threadsDeleted: number;
  messagesDeleted: number;
  threadsTrimmed: number;
};

/**
 * Rule 1. A chat list longer than the limit loses every chat that has gone
 * quiet for more than the inactivity window.
 *
 * Buy lists and Sell lists are counted separately, because they are separate
 * lists to the person reading them. A chat has two sides, so deleting it
 * removes it from the other person's list as well.
 */
async function crowdedBuyers(): Promise<string[]> {
  const rows = await prisma.chatThread.groupBy({
    by: ["buyerId"],
    _count: { id: true },
    having: { id: { _count: { gt: CHAT_LIST_LIMIT } } },
  });
  return rows.map((row) => row.buyerId);
}

async function crowdedSellers(): Promise<string[]> {
  const rows = await prisma.chatThread.groupBy({
    by: ["sellerId"],
    _count: { id: true },
    having: { id: { _count: { gt: CHAT_LIST_LIMIT } } },
  });
  return rows.map((row) => row.sellerId);
}

/** No message inside the window. A chat that never had one counts from when it was opened. */
function inactiveWhere(cutoff: Date) {
  return {
    OR: [{ lastMessageAt: { lt: cutoff } }, { lastMessageAt: null, createdAt: { lt: cutoff } }],
  };
}

async function sweepInactiveThreadsFor(role: "buyer" | "seller", cutoff: Date): Promise<number> {
  // Only the people whose list is over the limit are candidates at all.
  const userIds = role === "buyer" ? await crowdedBuyers() : await crowdedSellers();
  if (userIds.length === 0) return 0;

  const owner = role === "buyer" ? { buyerId: { in: userIds } } : { sellerId: { in: userIds } };

  const { count } = await prisma.chatThread.deleteMany({
    where: { ...owner, ...inactiveWhere(cutoff) },
  });

  return count;
}

export async function sweepInactiveThreads(now: Date = new Date()): Promise<number> {
  const cutoff = inactiveBefore(now);

  // Sequential, so the second pass sees what the first one removed.
  const buyers = await sweepInactiveThreadsFor("buyer", cutoff);
  const sellers = await sweepInactiveThreadsFor("seller", cutoff);

  return buyers + sellers;
}

/**
 * Rule 2. Every chat keeps its newest messages and loses the rest.
 *
 * The ids of the messages being kept are listed explicitly rather than
 * cutting on a timestamp, so two messages written in the same millisecond
 * cannot push each other over the edge.
 */
export async function trimThreadMessages(): Promise<{ messagesDeleted: number; threadsTrimmed: number }> {
  const overflowing = await prisma.message.groupBy({
    by: ["threadId"],
    _count: { id: true },
    having: { id: { _count: { gt: MESSAGES_PER_THREAD } } },
  });

  let messagesDeleted = 0;
  let threadsTrimmed = 0;

  for (const row of overflowing) {
    const keep = await prisma.message.findMany({
      where: { threadId: row.threadId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MESSAGES_PER_THREAD,
      select: { id: true },
    });

    const { count } = await prisma.message.deleteMany({
      where: {
        threadId: row.threadId,
        id: { notIn: keep.map((message) => message.id) },
      },
    });

    if (count > 0) {
      messagesDeleted += count;
      threadsTrimmed += 1;
    }
  }

  return { messagesDeleted, threadsTrimmed };
}

/**
 * The whole cleanup, in the order that does the least work: inactive chats go
 * first, taking their messages with them, then what is left is trimmed.
 */
export async function runChatRetention(now: Date = new Date()): Promise<RetentionReport> {
  const threadsDeleted = await sweepInactiveThreads(now);
  const { messagesDeleted, threadsTrimmed } = await trimThreadMessages();

  return { threadsDeleted, messagesDeleted, threadsTrimmed };
}
