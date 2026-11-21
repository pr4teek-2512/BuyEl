"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/server/auth/adminSession";
import {
  acceptPaymentRequest,
  PaymentError,
  rejectPaymentRequest,
} from "@/server/services/payment.service";
import type { FormState } from "../master-lists/state";

const PAGE = "payments" as const;

export async function reviewPaymentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);
    const requestId = String(formData.get("requestId") ?? "");
    const intent = String(formData.get("intent") ?? "");

    if (intent === "accept") {
      await acceptPaymentRequest(admin.id, requestId);
      revalidatePath("/admin/payments");
      revalidatePath("/admin");
      return { success: "Accepted. The student has been given what they paid for." };
    }

    if (intent === "reject") {
      const reason = String(formData.get("reason") ?? "");
      await rejectPaymentRequest(admin.id, requestId, reason);
      revalidatePath("/admin/payments");
      revalidatePath("/admin");
      return { success: "Rejected. The student has been notified." };
    }

    return { error: "Unknown action." };
  } catch (error) {
    if (error instanceof PaymentError) return { error: error.message };
    if (error instanceof Error) {
      if (error.message === "ADMIN_FORBIDDEN") return { error: "You cannot edit this page." };
      if (error.message === "ADMIN_UNAUTHENTICATED") return { error: "Sign in again." };
    }
    console.error("[admin payments] review failed", error);
    return { error: "Could not complete that review." };
  }
}
