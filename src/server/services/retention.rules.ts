/**
 * Chat and message retention, as pure functions.
 *
 * Two rules, both applied to Buy chats and Sell chats alike:
 *
 *  1. Once one side's chat list holds more than `CHAT_LIST_LIMIT` chats, every
 *     chat in that list with no message in the last `INACTIVE_DAYS` days is
 *     deleted for good. A list at or below the limit is left alone, however
 *     old its chats are.
 *  2. A chat keeps its newest `MESSAGES_PER_THREAD` messages. Anything older
 *     goes, permanently. This runs on a daily sweep rather than on every
 *     message, so a chat may sit above the limit until the next sweep.
 *
 * Nothing here is reversible: there is no archive, no soft delete flag and no
 * copy kept anywhere else. `retention.service.ts` turns these into queries.
 */

export const CHAT_LIST_LIMIT = 10;
export const INACTIVE_DAYS = 14;
export const MESSAGES_PER_THREAD = 100;

export type RetainableThread = {
  id: string;
  /** Null until the first message, so creation stands in for it. */
  lastMessageAt: Date | null;
  createdAt: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** The moment a chat last saw traffic. A chat nobody wrote in counts from its creation. */
export function lastActivityAt(thread: RetainableThread): Date {
  return thread.lastMessageAt ?? thread.createdAt;
}

/** Anything that last saw traffic before this is inactive. */
export function inactiveBefore(now: Date = new Date()): Date {
  return new Date(now.getTime() - INACTIVE_DAYS * DAY_MS);
}

export function isInactive(thread: RetainableThread, now: Date = new Date()): boolean {
  return lastActivityAt(thread).getTime() < inactiveBefore(now).getTime();
}

/** Rule 1 gate: only a list longer than the limit is swept at all. */
export function listNeedsSweep(threadCount: number): boolean {
  return threadCount > CHAT_LIST_LIMIT;
}

/**
 * Rule 1 for one person's list of chats in one role. Returns the ids to
 * delete, which is empty while the list is within the limit.
 */
export function threadsToDelete(
  threads: RetainableThread[],
  now: Date = new Date(),
): string[] {
  if (!listNeedsSweep(threads.length)) return [];
  return threads.filter((thread) => isInactive(thread, now)).map((thread) => thread.id);
}

/**
 * Rule 2 for one chat. Given its messages newest first, returns the ids of the
 * ones past the limit, which are the ones to delete.
 */
export function messagesToDelete<T extends { id: string }>(newestFirst: T[]): string[] {
  return newestFirst.slice(MESSAGES_PER_THREAD).map((message) => message.id);
}
