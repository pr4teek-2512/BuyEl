"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { adminLogin } from "@/server/services/admin.service";
import { createAdminSession } from "@/server/auth/adminSession";
import type { AdminLoginState } from "./state";

const schema = z.object({
  username: z.string().trim().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
});

export async function adminLoginAction(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const parsed = schema.safeParse({
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const result = await adminLogin(parsed.data.username, parsed.data.password);
  if (!result.ok) return { error: result.error };

  await createAdminSession(result.adminUserId);
  redirect("/admin");
}
