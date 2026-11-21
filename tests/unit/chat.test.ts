import { describe, expect, it } from "vitest";
import {
  compareThreads,
  isLockedFor,
  isUnread,
  toThreadView,
  validateMessage,
  type ThreadSource,
} from "@/server/services/chat.rules";

const NOW = new Date("2026-11-21T12:00:00.000Z");

function minutesAgo(minutes: number) {
  return new Date(NOW.getTime() - minutes * 60_000);
}

function thread(overrides: Partial<ThreadSource> = {}): ThreadSource {
  return {
    id: "thread-1",
    listingId: "listing-1",
    courseText: "Data Structures CS201",
    buyer: { name: "Priya", lastName: "Mehta" },
    seller: { name: "abhishek", lastName: "singh" },
    lastMessageAt: minutesAgo(5),
    buyerLastReadAt: null,
    sellerLastReadAt: null,
    lastMessageBody: "Is this still available?",
    sellerUnlocked: true,
    ...overrides,
  };
}

describe("anonymity", () => {
  it("shows the buyer only the seller's initials", () => {
    const view = toThreadView(thread(), "buyer");
    expect(view.counterpartInitials).toBe("AS");
  });

  it("shows the seller only the buyer's initials", () => {
    const view = toThreadView(thread(), "seller");
    expect(view.counterpartInitials).toBe("PM");
  });

  it("never carries a name, a phone number or a user id in the view", () => {
    const view = toThreadView(thread(), "buyer");
    const serialised = JSON.stringify(view).toLowerCase();

    expect(serialised).not.toContain("abhishek");
    expect(serialised).not.toContain("singh");
    expect(serialised).not.toContain("priya");
    expect(serialised).not.toContain("mehta");
    expect(Object.keys(view).sort()).toEqual([
      "counterpartInitials",
      "courseText",
      "id",
      "lastMessagePreview",
      "locked",
      "unread",
    ]);
  });
});

describe("the seller lock", () => {
  it("locks a seller who has not unlocked chat for that listing", () => {
    const locked = thread({ sellerUnlocked: false });
    expect(isLockedFor(locked, "seller")).toBe(true);
    expect(isLockedFor(locked, "buyer")).toBe(false);
  });

  it("hides even the message preview from a locked seller", () => {
    const view = toThreadView(thread({ sellerUnlocked: false }), "seller");
    expect(view.locked).toBe(true);
    expect(view.lastMessagePreview).toBeNull();
  });

  it("gives the buyer the same experience whether or not the seller unlocked", () => {
    const unlocked = toThreadView(thread({ sellerUnlocked: true }), "buyer");
    const locked = toThreadView(thread({ sellerUnlocked: false }), "buyer");

    expect(locked.locked).toBe(false);
    expect(locked.lastMessagePreview).toBe(unlocked.lastMessagePreview);
  });
});

describe("unread state", () => {
  it("is unread when nothing has been read yet", () => {
    expect(isUnread(thread(), "buyer")).toBe(true);
  });

  it("is read once the viewer opened it after the last message", () => {
    const seen = thread({ lastMessageAt: minutesAgo(10), buyerLastReadAt: minutesAgo(2) });
    expect(isUnread(seen, "buyer")).toBe(false);
  });

  it("goes unread again when a newer message arrives", () => {
    const fresh = thread({ lastMessageAt: minutesAgo(1), buyerLastReadAt: minutesAgo(30) });
    expect(isUnread(fresh, "buyer")).toBe(true);
  });

  it("is never unread on an empty conversation", () => {
    expect(isUnread(thread({ lastMessageAt: null }), "seller")).toBe(false);
  });

  it("tracks the two sides separately", () => {
    const mixed = thread({
      lastMessageAt: minutesAgo(1),
      buyerLastReadAt: minutesAgo(0),
      sellerLastReadAt: minutesAgo(60),
    });
    expect(isUnread(mixed, "buyer")).toBe(false);
    expect(isUnread(mixed, "seller")).toBe(true);
  });
});

describe("conversation ordering", () => {
  it("puts the most recently active conversation first", () => {
    const rows = [
      thread({ id: "a", lastMessageAt: minutesAgo(60) }),
      thread({ id: "b", lastMessageAt: minutesAgo(1) }),
      thread({ id: "c", lastMessageAt: null }),
    ];

    expect([...rows].sort(compareThreads).map((t) => t.id)).toEqual(["b", "a", "c"]);
  });
});

describe("message validation", () => {
  it("rejects an empty message", () => {
    expect(validateMessage("   ")).toEqual({ ok: false, error: "Type a message first." });
  });

  it("trims what is sent", () => {
    expect(validateMessage("  hello  ")).toEqual({ ok: true, body: "hello" });
  });

  it("rejects something far too long", () => {
    const result = validateMessage("x".repeat(2001));
    expect(result.ok).toBe(false);
  });
});
