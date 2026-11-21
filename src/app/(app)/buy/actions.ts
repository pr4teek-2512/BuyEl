"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { openChat } from "@/server/services/chat.service";
import type { ChatButtonState } from "./state";

/**
 * One credit per listing. Re-opening a conversation already paid for is free,
 * and the buyer's experience is the same whether or not the seller has
 * unlocked chat on their side.
 */
export async function openChatAction(
  _prev: ChatButtonState,
  formData: FormData,
): Promise<ChatButtonState> {
  const listingId = String(formData.get("listingId") ?? "");

  let destination: string | null = null;

  try {
    const user = await requireUser();
    const result = await openChat(user.id, listingId);

    if (!result.ok) {
      return result.reason === "insufficient_credits"
        ? { status: "no_credits", error: result.error }
        : { status: "error", error: result.error };
    }

    revalidatePath("/buy");
    revalidatePath("/chat");
    destination = `/chat/${result.threadId}`;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return { status: "error", error: "Your session expired. Sign in again." };
    }
    return { status: "error", error: "Could not open that chat." };
  }

  redirect(destination);
}
