"use server";

import { redirect } from "next/navigation";
import { destroyAdminSession } from "@/server/auth/adminSession";

export async function adminSignOutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}
