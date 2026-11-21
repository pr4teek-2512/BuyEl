"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { ADMIN_PAGES, requireAdmin, requireEditor } from "@/server/auth/adminSession";
import {
  AdminAccountError,
  createEmployee,
  deleteEmployee,
  deleteTestAccount,
  saveTestAccount,
  updateEmployee,
  updateOwner,
} from "@/server/services/adminAccounts.service";
import { sendOtp, verifyOtp } from "@/server/services/otp.service";
import { env } from "@/lib/env";
import { maskPhone } from "@/lib/text";
import type { FormState } from "../master-lists/state";
import type { OwnerEditState } from "./state";

const PAGE = "user_access" as const;

function failure(error: unknown): FormState {
  if (error instanceof AdminAccountError) return { error: error.message };
  if (error instanceof Error) {
    if (error.message === "ADMIN_FORBIDDEN") return { error: "You cannot edit this page." };
    if (error.message === "ADMIN_UNAUTHENTICATED") return { error: "Sign in again." };
  }
  console.error("[user access] failed", error);
  return { error: "Something went wrong." };
}

function done(message: string): FormState {
  revalidatePath("/admin/user-access");
  return { success: message };
}

function readPermissions(formData: FormData) {
  return ADMIN_PAGES.map((page) => ({
    pageKey: page.key as string,
    canView: formData.get(`view:${page.key}`) === "on",
    canEdit: formData.get(`edit:${page.key}`) === "on",
  }));
}

export async function saveEmployeeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "");
    const password = String(formData.get("password") ?? "");
    const permissions = readPermissions(formData);

    if (id) {
      await updateEmployee(admin.id, id, {
        name,
        password: password || undefined,
        permissions,
      });
      return done("Employee updated.");
    }

    await createEmployee(admin.id, {
      name,
      username: String(formData.get("username") ?? ""),
      password,
      permissions,
    });

    return done("Employee added. Share the username and password with them directly.");
  } catch (error) {
    return failure(error);
  }
}

export async function deleteEmployeeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);
    await deleteEmployee(admin.id, String(formData.get("id") ?? ""));
    return done("Employee removed.");
  } catch (error) {
    return failure(error);
  }
}

// ---------------------------------------------------------------------------
// Owner account, protected by an OTP to the nominated number
// ---------------------------------------------------------------------------

export async function ownerEditAction(
  prev: OwnerEditState,
  formData: FormData,
): Promise<OwnerEditState> {
  try {
    const admin = await requireAdmin();
    if (admin.role !== "owner") {
      return { ...prev, error: "Only the owner can change the owner account." };
    }

    const intent = String(formData.get("intent") ?? "");
    const phone = env.adminOwner.otpPhone;

    if (intent === "send_code") {
      const outcome = await sendOtp(phone, "admin_owner_edit");
      if (!outcome.ok) return { ...prev, step: "verify", error: outcome.error };

      return {
        step: "verify",
        maskedPhone: maskPhone(phone),
        devCode: "devCode" in outcome ? outcome.devCode : undefined,
      };
    }

    if (intent === "save") {
      const code = String(formData.get("code") ?? "");
      const verified = await verifyOtp(phone, code);
      if (!verified.ok) return { ...prev, step: "verify", error: verified.error };

      await updateOwner(admin.id, {
        name: String(formData.get("name") ?? ""),
        username: String(formData.get("username") ?? ""),
        password: String(formData.get("password") ?? "") || undefined,
      });

      revalidatePath("/admin/user-access");
      return { step: "done", success: "Owner account updated." };
    }

    return prev;
  } catch (error) {
    const result = failure(error);
    return { ...prev, step: "verify", error: result.error };
  }
}

// ---------------------------------------------------------------------------
// Test accounts
// ---------------------------------------------------------------------------

export async function saveTestAccountAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);

    await saveTestAccount(admin.id, {
      id: String(formData.get("id") ?? "") || undefined,
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      fixedOtp: String(formData.get("fixedOtp") ?? ""),
      canAccessPaidServices: formData.get("canAccessPaidServices") === "on",
      testModeOn: formData.get("testModeOn") === "on",
      redoOnboarding: formData.get("redoOnboarding") === "on",
    });

    return done("Test account saved.");
  } catch (error) {
    return failure(error);
  }
}

export async function deleteTestAccountAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);
    await deleteTestAccount(admin.id, String(formData.get("id") ?? ""));
    return done("Test account removed. Anything it created is still there.");
  } catch (error) {
    return failure(error);
  }
}

/** Used by the page to show how many real students exist versus test ones. */
export async function countTestUsers() {
  return prisma.user.count({ where: { isTestAccount: true } });
}
