"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { ChatError, messagesSince, sendMessage } from "@/server/services/chat.service";

export type SendResult = {
  error?: string;
  message?: { id: string; mine: boolean; body: string; createdAt: string };
};

export async function sendMessageAction(threadId: string, body: string): Promise<SendResult> {
  try {
    const user = await requireUser();
    await sendMessage(user.id, threadId, body);

    // Hand the saved message straight back so the thread updates immediately.
    const latest = await messagesSince(user.id, threadId);
    const mine = latest.filter((message) => message.mine).at(-1);

    revalidatePath("/chat");
    return { message: mine };
  } catch (error) {
    if (error instanceof ChatError) return { error: error.message };
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return { error: "Your session expired. Sign in again." };
    }
    return { error: "Could not send that message." };
  }
}
