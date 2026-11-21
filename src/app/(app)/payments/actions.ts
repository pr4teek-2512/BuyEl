"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { PaymentError, submitPaymentRequest } from "@/server/services/payment.service";
import type { PaymentState } from "./state";

export async function submitPaymentAction(
  _prev: PaymentState,
  formData: FormData,
): Promise<PaymentState> {
  try {
    const user = await requireUser();

    await submitPaymentRequest({
      userId: user.id,
      planId: String(formData.get("planId") ?? ""),
      platformId: String(formData.get("platformId") ?? ""),
      txnId: String(formData.get("txnId") ?? ""),
      listingId: String(formData.get("listingId") ?? "") || null,
    });

    revalidatePath("/sell");
    revalidatePath("/buy");
    revalidatePath("/payments");

    return { status: "submitted" };
  } catch (error) {
    if (error instanceof PaymentError) return { status: "error", error: error.message };
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return { status: "error", error: "Your session expired. Sign in again." };
    }
    console.error("[payments] submit failed", error);
    return { status: "error", error: "Could not submit that payment." };
  }
}
