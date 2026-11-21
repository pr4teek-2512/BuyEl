import { describe, expect, it } from "vitest";
import {
  BOOSTED_CHAT_THRESHOLD,
  buildFeedFilters,
  NORMAL_CHAT_THRESHOLD,
  compareListings,
  decidePushToBottom,
  isBoostedNow,
  planPage,
  rankFromAboveCount,
  sortListings,
  type OrderableListing,
} from "@/server/services/ordering.rules";

const NOW = new Date("2026-11-21T12:00:00.000Z");

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60_000);
}

function listing(id: string, overrides: Partial<OrderableListing> = {}): OrderableListing {
  return {
    id,
    isBoosted: false,
    boostExpiresAt: null,
    boostOrderKey: null,
    normalOrderKey: minutesAgo(60),
    distinctBuyerChatCount: 0,
    pushedToBottomNormal: false,
    pushedToBottomBoost: false,
    ...overrides,
  };
}

function boosted(id: string, boostedMinutesAgo: number, overrides: Partial<OrderableListing> = {}) {
  return listing(id, {
    isBoosted: true,
    boostExpiresAt: new Date(NOW.getTime() + 10 * 24 * 60 * 60_000),
    boostOrderKey: minutesAgo(boostedMinutesAgo),
    ...overrides,
  });
}

describe("rule 1: boosted listings sit above normal ones", () => {
  it("puts every boosted listing above every normal listing", () => {
    const rows = [
      listing("normal-old", { normalOrderKey: minutesAgo(500) }),
      boosted("boost-new", 1),
      listing("normal-new", { normalOrderKey: minutesAgo(1) }),
      boosted("boost-old", 300),
    ];

    expect(sortListings(rows, NOW).map((r) => r.id)).toEqual([
      "boost-new",
      "boost-old",
      "normal-old",
      "normal-new",
    ]);
  });
});

describe("rule 2: newest boost first", () => {
  it("orders the boosted bucket by boost time descending", () => {
    const rows = [boosted("b1", 30), boosted("b2", 5), boosted("b3", 90)];
    expect(sortListings(rows, NOW).map((r) => r.id)).toEqual(["b2", "b1", "b3"]);
  });
});

describe("rules 3 and 4: a new listing lands at the very bottom", () => {
  it("orders the normal bucket oldest first", () => {
    const rows = [
      listing("middle", { normalOrderKey: minutesAgo(60) }),
      listing("newest", { normalOrderKey: minutesAgo(1) }),
      listing("oldest", { normalOrderKey: minutesAgo(600) }),
    ];

    expect(sortListings(rows, NOW).map((r) => r.id)).toEqual(["oldest", "middle", "newest"]);
  });

  it("places a brand new listing below everything else in its bucket", () => {
    const existing = [
      listing("a", { normalOrderKey: minutesAgo(300) }),
      listing("b", { normalOrderKey: minutesAgo(200) }),
    ];
    const fresh = listing("fresh", { normalOrderKey: NOW });

    const sorted = sortListings([...existing, fresh], NOW);
    expect(sorted[sorted.length - 1].id).toBe("fresh");
  });
});

describe("rule 9: boost expiry is decided at read time", () => {
  it("treats an expired boost as a normal listing with no job to run", () => {
    const expired = listing("expired", {
      isBoosted: true,
      boostExpiresAt: minutesAgo(1),
      boostOrderKey: minutesAgo(10),
      normalOrderKey: minutesAgo(400),
    });
    const live = boosted("live", 50);
    const normal = listing("normal", { normalOrderKey: minutesAgo(10) });

    expect(isBoostedNow(expired, NOW)).toBe(false);
    expect(isBoostedNow(live, NOW)).toBe(true);

    // The expired one falls back into the normal bucket, in its own position.
    expect(sortListings([normal, expired, live], NOW).map((r) => r.id)).toEqual([
      "live",
      "expired",
      "normal",
    ]);
  });

  it("treats a listing flagged boosted with no expiry as not boosted", () => {
    expect(isBoostedNow(listing("x", { isBoosted: true }), NOW)).toBe(false);
  });
});

describe("rules 6 and 7: the chat thresholds", () => {
  it("does not move a normal listing below 3 distinct buyer chats", () => {
    for (let count = 0; count < NORMAL_CHAT_THRESHOLD; count += 1) {
      expect(decidePushToBottom(listing("n", { distinctBuyerChatCount: count }), NOW)).toEqual({
        push: false,
      });
    }
  });

  it("moves a normal listing to the bottom of its bucket at exactly 3", () => {
    expect(
      decidePushToBottom(listing("n", { distinctBuyerChatCount: NORMAL_CHAT_THRESHOLD }), NOW),
    ).toEqual({ push: true, bucket: "normal" });
  });

  it("uses a threshold of 4 for a boosted listing", () => {
    expect(decidePushToBottom(boosted("b", 10, { distinctBuyerChatCount: 3 }), NOW)).toEqual({
      push: false,
    });
    expect(
      decidePushToBottom(boosted("b", 10, { distinctBuyerChatCount: BOOSTED_CHAT_THRESHOLD }), NOW),
    ).toEqual({ push: true, bucket: "boosted" });
  });

  it("pushes only once per bucket, so later chats do not keep moving it", () => {
    expect(
      decidePushToBottom(
        listing("n", { distinctBuyerChatCount: 9, pushedToBottomNormal: true }),
        NOW,
      ),
    ).toEqual({ push: false });

    expect(
      decidePushToBottom(
        boosted("b", 10, { distinctBuyerChatCount: 12, pushedToBottomBoost: true }),
        NOW,
      ),
    ).toEqual({ push: false });
  });

  it("applies the boosted threshold only while the boost is live", () => {
    const expiredWithChats = listing("x", {
      isBoosted: true,
      boostExpiresAt: minutesAgo(5),
      distinctBuyerChatCount: 3,
    });

    // Back in the normal bucket, so the normal threshold of 3 applies.
    expect(decidePushToBottom(expiredWithChats, NOW)).toEqual({ push: true, bucket: "normal" });
  });
});

describe("rule 8: chats never change bucket", () => {
  it("keeps a boosted listing boosted after it is pushed down", () => {
    const pushed = boosted("b", 10, {
      distinctBuyerChatCount: 10,
      pushedToBottomBoost: true,
      boostOrderKey: minutesAgo(999),
    });
    const normalNewest = listing("n", { normalOrderKey: minutesAgo(1) });

    expect(sortListings([normalNewest, pushed], NOW)[0].id).toBe("b");
  });

  it("keeps a pushed normal listing below its bucket but above nothing boosted", () => {
    const pushedNormal = listing("n1", { normalOrderKey: NOW, pushedToBottomNormal: true });
    const otherNormal = listing("n2", { normalOrderKey: minutesAgo(10) });
    const live = boosted("b1", 1);

    expect(sortListings([pushedNormal, otherNormal, live], NOW).map((r) => r.id)).toEqual([
      "b1",
      "n2",
      "n1",
    ]);
  });
});

describe("the exact scenario in the PRD", () => {
  it("moves Abhishek's listing from 10th to last among normal listings after 3 chats", () => {
    // Ten normal listings, Abhishek's sits 10th because it is the newest.
    const rows = Array.from({ length: 9 }, (_, index) =>
      listing(`other-${index}`, { normalOrderKey: minutesAgo(1000 - index * 10) }),
    );
    const abhishek = listing("abhishek", { normalOrderKey: minutesAgo(900) });
    const newer = listing("newer", { normalOrderKey: minutesAgo(5) });

    const before = sortListings([...rows, abhishek, newer], NOW).map((r) => r.id);
    expect(before.indexOf("abhishek")).toBeLessThan(before.indexOf("newer"));

    // Three different buyers start a chat.
    const afterChats = { ...abhishek, distinctBuyerChatCount: 3 };
    const decision = decidePushToBottom(afterChats, NOW);
    expect(decision).toEqual({ push: true, bucket: "normal" });

    // Applying the decision rewrites the key to now.
    const moved = { ...afterChats, normalOrderKey: NOW, pushedToBottomNormal: true };
    const after = sortListings([...rows, moved, newer], NOW).map((r) => r.id);
    expect(after[after.length - 1]).toBe("abhishek");
  });
});

describe("comparator stability", () => {
  it("falls back to the id when two keys are identical", () => {
    const same = minutesAgo(10);
    const a = listing("aaa", { normalOrderKey: same });
    const b = listing("bbb", { normalOrderKey: same });

    expect(compareListings(a, b, NOW)).toBeLessThan(0);
    expect(compareListings(b, a, NOW)).toBeGreaterThan(0);
  });
});

describe("paging across the two buckets", () => {
  it("fills the first page from the boosted bucket", () => {
    expect(planPage(12, 0, 10)).toEqual({
      boostedSkip: 0,
      boostedTake: 10,
      normalSkip: 0,
      normalTake: 0,
    });
  });

  it("spans the boundary between the buckets", () => {
    expect(planPage(12, 10, 10)).toEqual({
      boostedSkip: 10,
      boostedTake: 2,
      normalSkip: 0,
      normalTake: 8,
    });
  });

  it("reads only from the normal bucket once the boosted ones are past", () => {
    expect(planPage(12, 20, 10)).toEqual({
      boostedSkip: 12,
      boostedTake: 0,
      normalSkip: 8,
      normalTake: 10,
    });
  });

  it("handles having no boosted listings at all", () => {
    expect(planPage(0, 0, 10)).toEqual({
      boostedSkip: 0,
      boostedTake: 0,
      normalSkip: 0,
      normalTake: 10,
    });
  });
});

describe("seller rank", () => {
  it("is one based", () => {
    expect(rankFromAboveCount(0)).toBe(1);
    expect(rankFromAboveCount(7)).toBe(8);
  });
});

describe("the public search and the Buy page share one feed", () => {
  it("builds identical filters apart from hiding your own listings", async () => {
    const { buildFeedFilters } = await import("@/server/services/ordering.rules");

    const visitor = buildFeedFilters({ college: "DTU", course: "DBMS" });
    const student = buildFeedFilters({ college: "DTU", course: "DBMS", viewerId: "user-1" });

    expect({ ...visitor, excludeSellerId: undefined }).toEqual({
      ...student,
      excludeSellerId: undefined,
    });
    expect(visitor.excludeSellerId).toBeUndefined();
    expect(student.excludeSellerId).toBe("user-1");
  });

  it("treats blank filters as no filter at all", () => {
    const filters = buildFeedFilters({ college: "   ", course: "" });
    expect(filters.collegeText).toBeNull();
    expect(filters.courseText).toBeNull();
    expect(filters.status).toBe("active");
  });

  it("carries the sold out tab through unchanged", () => {
    expect(buildFeedFilters({ status: "closed" }).status).toBe("closed");
  });
});
