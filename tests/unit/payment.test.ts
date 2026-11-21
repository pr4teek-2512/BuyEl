import { describe, expect, it } from "vitest";
import {
  computeBoostWindow,
  describePlan,
  isPlanPayable,
  normalizeTxnId,
  requiresListing,
  targetTypeFor,
  validatePlanShape,
  validateTxnId,
} from "@/server/services/payment.rules";

const NOW = new Date("2026-11-21T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

describe("what an accepted payment unlocks", () => {
  it("maps each plan category to its grant", () => {
    expect(targetTypeFor("credits")).toBe("wallet");
    expect(targetTypeFor("seller_chat_unlock")).toBe("listing_unlock");
    expect(targetTypeFor("boost")).toBe("listing_boost");
  });

  it("knows which purchases are about one listing", () => {
    expect(requiresListing("credits")).toBe(false);
    expect(requiresListing("seller_chat_unlock")).toBe(true);
    expect(requiresListing("boost")).toBe(true);
  });
});

describe("boost windows", () => {
  it("runs from now for a listing that is not boosted", () => {
    const window = computeBoostWindow(NOW, null, 10);
    expect(window.startsAt).toEqual(NOW);
    expect(window.endsAt).toEqual(new Date(NOW.getTime() + 10 * DAY));
  });

  it("adds to what is left when the listing is already boosted", () => {
    const remaining = new Date(NOW.getTime() + 4 * DAY);
    const window = computeBoostWindow(NOW, remaining, 30);

    // The student does not lose the 4 days they already paid for.
    expect(window.endsAt).toEqual(new Date(NOW.getTime() + 34 * DAY));
  });

  it("ignores an expiry that has already passed", () => {
    const expired = new Date(NOW.getTime() - 5 * DAY);
    const window = computeBoostWindow(NOW, expired, 14);
    expect(window.endsAt).toEqual(new Date(NOW.getTime() + 14 * DAY));
  });
});

describe("transaction ids", () => {
  it("strips spaces and upper cases what the student pasted", () => {
    expect(normalizeTxnId("  5312 7788 9021 ")).toBe("531277889021");
    expect(normalizeTxnId("abc123def")).toBe("ABC123DEF");
  });

  it("treats the same reference typed differently as one id", () => {
    expect(normalizeTxnId("5312 7788 9021")).toBe(normalizeTxnId("531277889021"));
  });

  it("accepts a normal UPI reference", () => {
    expect(validateTxnId("531277889021")).toEqual({ ok: true, txnId: "531277889021" });
  });

  it("rejects empty, short, long and strange input", () => {
    expect(validateTxnId("   ").ok).toBe(false);
    expect(validateTxnId("123").ok).toBe(false);
    expect(validateTxnId("1".repeat(41)).ok).toBe(false);
    expect(validateTxnId("abc@123!").ok).toBe(false);
  });
});

describe("plan descriptions", () => {
  it("describes a credit pack in the words a student understands", () => {
    expect(
      describePlan({
        category: "credits",
        label: "Starter",
        price: 49,
        creditsGranted: 2,
        boostDays: null,
      }),
    ).toBe("2 chat unlocks");
  });

  it("uses the singular for one", () => {
    expect(
      describePlan({
        category: "credits",
        label: "Single",
        price: 29,
        creditsGranted: 1,
        boostDays: null,
      }),
    ).toBe("1 chat unlock");
  });

  it("describes a boost by its duration", () => {
    expect(
      describePlan({
        category: "boost",
        label: "10 days",
        price: 29,
        creditsGranted: null,
        boostDays: 10,
      }),
    ).toBe("Priority placement for 10 days");
  });

  it("describes a seller unlock", () => {
    expect(
      describePlan({
        category: "seller_chat_unlock",
        label: "Unlock",
        price: 19,
        creditsGranted: null,
        boostDays: null,
      }),
    ).toBe("Chat access for this listing");
  });
});

describe("a plan is only offered once it can actually be paid", () => {
  it("needs a price, a QR code and to be switched on", () => {
    expect(isPlanPayable({ price: 49, qrImageUrl: "https://x/qr.png", isActive: true })).toBe(true);
    expect(isPlanPayable({ price: 49, qrImageUrl: null, isActive: true })).toBe(false);
    expect(isPlanPayable({ price: 0, qrImageUrl: "https://x/qr.png", isActive: true })).toBe(false);
    expect(isPlanPayable({ price: 49, qrImageUrl: "https://x/qr.png", isActive: false })).toBe(
      false,
    );
  });
});

describe("plan validation in the admin panel", () => {
  it("requires a credit count on a credit pack", () => {
    expect(validatePlanShape({ category: "credits", price: 49 }).ok).toBe(false);
    expect(validatePlanShape({ category: "credits", price: 49, creditsGranted: 2 }).ok).toBe(true);
  });

  it("requires a duration on a boost", () => {
    expect(validatePlanShape({ category: "boost", price: 29 }).ok).toBe(false);
    expect(validatePlanShape({ category: "boost", price: 29, boostDays: 10 }).ok).toBe(true);
  });

  it("requires a sensible price everywhere", () => {
    expect(validatePlanShape({ category: "seller_chat_unlock", price: 0 }).ok).toBe(false);
    expect(validatePlanShape({ category: "seller_chat_unlock", price: 19 }).ok).toBe(true);
  });
});
