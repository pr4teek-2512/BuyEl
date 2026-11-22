"use server";

import { redirect } from "next/navigation";
import { destroyUserSession } from "@/server/auth/session";

export async function signOutAction() {
  await destroyUserSession();
  redirect("/login");
}
