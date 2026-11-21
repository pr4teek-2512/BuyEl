"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireEditor } from "@/server/auth/adminSession";
import { writeAudit } from "@/server/services/admin.service";
import { grantCredits } from "@/server/services/credit.service";
import type { FormState } from "../master-lists/state";

const PAGE = "users" as const;

function failure(error: unknown): FormState {
  if (error instanceof Error) {
    if (error.message === "ADMIN_FORBIDDEN") return { error: "You cannot edit this page." };
    if (error.message === "ADMIN_UNAUTHENTICATED") return { error: "Sign in again." };
    return { error: error.message };
  }
  return { error: "Something went wrong." };
}

function done(message: string): FormState {
  revalidatePath("/admin/users");
  return { success: message };
}

/** Manual credit adjustment, always written to the ledger and the audit log. */
export async function adjustCreditsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);
    const userId = String(formData.get("userId") ?? "");
    const amount = Number(formData.get("amount") ?? 0);
    const note = String(formData.get("note") ?? "").trim();

    if (!Number.isInteger(amount) || amount === 0) {
      return { error: "Enter a whole number of credits, positive or negative." };
    }
    if (Math.abs(amount) > 100) {
      return { error: "Adjust by at most 100 credits at a time." };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });
    if (!user) return { error: "Student not found." };

    if (amount > 0) {
      await grantCredits(userId, amount, "admin_adjust", admin.id, note || "Admin adjustment");
    } else {
      if (user.creditBalance + amount < 0) {
        return { error: `They only have ${user.creditBalance} credits.` };
      }

      await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: userId },
          data: { creditBalance: { increment: amount } },
          select: { creditBalance: true },
        });

        await tx.creditLedgerEntry.create({
          data: {
            userId,
            delta: amount,
            reason: "admin_adjust",
            refId: admin.id,
            balanceAfter: updated.creditBalance,
            note: note || "Admin adjustment",
          },
        });
      });
    }

    await writeAudit({
      adminUserId: admin.id,
      action: "adjust_credits",
      entity: "user",
      entityId: userId,
      after: { amount, note },
    });

    return done(`${amount > 0 ? "Added" : "Removed"} ${Math.abs(amount)} credits.`);
  } catch (error) {
    return failure(error);
  }
}

export async function toggleBlockAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);
    const userId = String(formData.get("userId") ?? "");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (!user) return { error: "Student not found." };

    const next = user.status === "blocked" ? "active" : "blocked";

    await prisma.user.update({ where: { id: userId }, data: { status: next } });

    // Blocking also ends any session they have open.
    if (next === "blocked") {
      await prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await writeAudit({
      adminUserId: admin.id,
      action: next === "blocked" ? "block_user" : "unblock_user",
      entity: "user",
      entityId: userId,
    });

    return done(next === "blocked" ? "Student blocked and signed out." : "Student unblocked.");
  } catch (error) {
    return failure(error);
  }
}
