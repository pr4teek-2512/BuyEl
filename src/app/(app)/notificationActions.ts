"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth/session";
import { markNotificationsRead } from "@/server/services/notification.service";

export async function markNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) return;

  await markNotificationsRead(user.id);
  revalidatePath("/buy");
}
