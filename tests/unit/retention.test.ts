import { describe, expect, it } from "vitest";
import {
  CHAT_LIST_LIMIT,
  INACTIVE_DAYS,
  MESSAGES_PER_THREAD,
  inactiveBefore,
  isInactive,
  lastActivityAt,
  listNeedsSweep,
  messagesToDelete,
  threadsToDelete,
  type RetainableThread,
} from "@/server/services/retention.rules";

const NOW = new Date("2026-11-22T12:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function thread(id: string, lastMessageDaysAgo: number | null, createdDaysAgo = 30): RetainableThread {
  return {
    id,
    lastMessageAt: lastMessageDaysAgo === null ? null : daysAgo(lastMessageDaysAgo),
    createdAt: daysAgo(createdDaysAgo),
  };
}

/** A list long enough that rule 1 applies at all. */
function crowded(extra: RetainableThread[]): RetainableThread[] {
  const busy = Array.from({ length: CHAT_LIST_LIMIT }, (_, index) =>
    thread(`busy-${index}`, 1),
  );
  return [...busy, ...extra];
}

describe("when a chat counts as inactive", () => {
  it("measures from the last message", () => {
    expect(lastActivityAt(thread("a", 3))).toEqual(daysAgo(3));
  });

  it("falls back to when the chat was opened if nobody ever wrote", () => {
    expect(lastActivityAt(thread("a", null, 20))).toEqual(daysAgo(20));
  });

  it("needs more than the window to have passed", () => {
    expect(isInactive(thread("a", INACTIVE_DAYS - 1), NOW)).toBe(false);
    expect(isInactive(thread("a", INACTIVE_DAYS + 1), NOW)).toBe(true);
  });

  it("keeps a chat that went quiet exactly on the boundary", () => {
    expect(isInactive(thread("a", INACTIVE_DAYS), NOW)).toBe(false);
  });

  it("puts the cutoff a fortnight back", () => {
    expect(inactiveBefore(NOW)).toEqual(daysAgo(INACTIVE_DAYS));
  });
});

describe("rule 1, sweeping a crowded chat list", () => {
  it("leaves a list at the limit alone, however old its chats are", () => {
    const list = Array.from({ length: CHAT_LIST_LIMIT }, (_, index) =>
      thread(`old-${index}`, 400),
    );

    expect(listNeedsSweep(list.length)).toBe(false);
    expect(threadsToDelete(list, NOW)).toEqual([]);
  });

  it("deletes only the inactive chats once the list is over the limit", () => {
    const list = crowded([thread("stale", 30), thread("fresh", 2), thread("older", 90)]);

    expect(listNeedsSweep(list.length)).toBe(true);
    expect(threadsToDelete(list, NOW)).toEqual(["stale", "older"]);
  });

  it("sweeps a chat nobody ever wrote in, dated from when it was opened", () => {
    const list = crowded([thread("silent", null, 40), thread("just-opened", null, 1)]);

    expect(threadsToDelete(list, NOW)).toEqual(["silent"]);
  });

  it("can empty a list below the limit, since the gate is only a trigger", () => {
    const list = Array.from({ length: CHAT_LIST_LIMIT + 1 }, (_, index) =>
      thread(`old-${index}`, 60),
    );

    expect(threadsToDelete(list, NOW)).toHaveLength(CHAT_LIST_LIMIT + 1);
  });
});

describe("rule 2, trimming a chat back to its newest messages", () => {
  function messages(count: number) {
    return Array.from({ length: count }, (_, index) => ({ id: `m-${index}` }));
  }

  it("keeps everything while the chat is at the limit", () => {
    expect(messagesToDelete(messages(MESSAGES_PER_THREAD))).toEqual([]);
  });

  it("drops only what is past the limit, counting from the newest", () => {
    const doomed = messagesToDelete(messages(MESSAGES_PER_THREAD + 3));

    expect(doomed).toEqual([
      `m-${MESSAGES_PER_THREAD}`,
      `m-${MESSAGES_PER_THREAD + 1}`,
      `m-${MESSAGES_PER_THREAD + 2}`,
    ]);
  });

  it("handles a chat that has sat over the limit since the last sweep", () => {
    expect(messagesToDelete(messages(MESSAGES_PER_THREAD + 250))).toHaveLength(250);
  });
});
