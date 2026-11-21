/**
 * Payment rules from PRD section 6 and 8, as pure functions.
 *
 * There is no payment gateway. A student pays through a UPI QR code and then
 * types in the transaction reference, and an admin accepts or rejects it.
 * Everything that decides what a payment is worth lives here so it can be
 * tested without a database.
 */

export type PlanCategory = "credits" | "seller_chat_unlock" | "boost";
export type PaymentTargetType = "wallet" | "listing_unlock" | "listing_boost";

/** What the accepted payment will actually unlock. */
export function targetTypeFor(category: PlanCategory): PaymentTargetType {
  switch (category) {
    case "credits":
      return "wallet";
    case "seller_chat_unlock":
      return "listing_unlock";
    case "boost":
      return "listing_boost";
  }
}

export function requiresListing(category: PlanCategory): boolean {
  return category !== "credits";
}

/**
 * PRD section 8: a listing that is already boosted can be boosted again by
 * paying again. The new window is added on top of whatever is left, and the
 * listing returns to the top of the boosted bucket because its order key is
 * rewritten to now.
 */
export function computeBoostWindow(
  now: Date,
  currentExpiry: Date | null,
  days: number,
): { startsAt: Date; endsAt: Date } {
  const base = currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
  return {
    startsAt: now,
    endsAt: new Date(base.getTime() + days * 24 * 60 * 60 * 1000),
  };
}

/**
 * UPI reference numbers are 12 digits, but every app labels them differently
 * and some print them with spaces, so this is deliberately forgiving about
 * shape while still rejecting obvious nonsense.
 */
export function normalizeTxnId(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

export type TxnValidation = { ok: true; txnId: string } | { ok: false; error: string };

export function validateTxnId(raw: string): TxnValidation {
  const txnId = normalizeTxnId(raw);

  if (txnId.length === 0) return { ok: false, error: "Enter the transaction ID." };
  if (txnId.length < 6) return { ok: false, error: "That transaction ID looks too short." };
  if (txnId.length > 40) return { ok: false, error: "That transaction ID looks too long." };
  if (!/^[A-Z0-9-]+$/.test(txnId)) {
    return { ok: false, error: "Use only letters, numbers and dashes." };
  }

  return { ok: true, txnId };
}

export type PlanSummary = {
  category: PlanCategory;
  label: string;
  price: number;
  creditsGranted: number | null;
  boostDays: number | null;
};

/** One line describing what the student is about to pay for. */
export function describePlan(plan: PlanSummary): string {
  if (plan.category === "credits") {
    const credits = plan.creditsGranted ?? 0;
    return `${credits} chat ${credits === 1 ? "unlock" : "unlocks"}`;
  }
  if (plan.category === "boost") {
    const days = plan.boostDays ?? 0;
    return `Priority placement for ${days} ${days === 1 ? "day" : "days"}`;
  }
  return "Chat access for this listing";
}

/** A plan is only usable once an admin has given it a QR code and a price. */
export function isPlanPayable(plan: {
  price: number;
  qrImageUrl: string | null;
  isActive: boolean;
}): boolean {
  return plan.isActive && plan.price > 0 && Boolean(plan.qrImageUrl);
}

export function validatePlanShape(input: {
  category: PlanCategory;
  price: number;
  creditsGranted?: number | null;
  boostDays?: number | null;
}): { ok: true } | { ok: false; error: string } {
  if (!Number.isInteger(input.price) || input.price < 1) {
    return { ok: false, error: "Enter a price of at least 1 rupee." };
  }

  if (input.category === "credits") {
    if (!input.creditsGranted || input.creditsGranted < 1) {
      return { ok: false, error: "Say how many chat unlocks this pack gives." };
    }
  }

  if (input.category === "boost") {
    if (!input.boostDays || input.boostDays < 1) {
      return { ok: false, error: "Say how many days the boost lasts." };
    }
  }

  return { ok: true };
}
