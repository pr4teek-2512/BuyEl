import "server-only";
import { prisma } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";
import type { CreditReason } from "@/generated/prisma/enums";

/**
 * In-app currency (PRD section 5).
 *
 * `credit_ledger` is append only and is the source of truth.
 * `users.credit_balance` is a cached mirror, always written in the same
 * transaction as the ledger row, so the two can never drift.
 */

export class InsufficientCreditsError extends Error {
  constructor() {
    super("You need 1 credit to start this chat.");
    this.name = "InsufficientCreditsError";
  }
}

type Tx = Prisma.TransactionClient;

/**
 * Compare and decrement in one statement. If the balance is already zero the
 * update matches no rows, which is what makes a double spend impossible even
 * when two requests arrive at the same moment.
 */
export async function debitOneCredit(
  tx: Tx,
  userId: string,
  reason: CreditReason,
  refId: string,
): Promise<number> {
  const result = await tx.user.updateMany({
    where: { id: userId, creditBalance: { gte: 1 } },
    data: { creditBalance: { decrement: 1 } },
  });

  if (result.count === 0) throw new InsufficientCreditsError();

  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { creditBalance: true },
  });

  await tx.creditLedgerEntry.create({
    data: {
      userId,
      delta: -1,
      reason,
      refId,
      balanceAfter: user.creditBalance,
    },
  });

  return user.creditBalance;
}

/** Used by the payment grant in phase 5, and by a manual admin adjustment. */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: CreditReason,
  refId?: string,
  note?: string,
): Promise<number> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Credit amount must be a positive whole number.");
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { increment: amount } },
      select: { creditBalance: true },
    });

    await tx.creditLedgerEntry.create({
      data: {
        userId,
        delta: amount,
        reason,
        refId: refId ?? null,
        balanceAfter: user.creditBalance,
        note: note ?? null,
      },
    });

    return user.creditBalance;
  });
}

export async function getLedger(userId: string, take = 50) {
  return prisma.creditLedgerEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/** Recomputes the cached balance from the ledger. Used by support tooling. */
export async function reconcileBalance(userId: string): Promise<number> {
  const entries = await prisma.creditLedgerEntry.findMany({
    where: { userId },
    select: { delta: true },
  });

  const balance = entries.reduce((sum, entry) => sum + entry.delta, 0);
  await prisma.user.update({ where: { id: userId }, data: { creditBalance: balance } });
  return balance;
}
