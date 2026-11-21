"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireEditor } from "@/server/auth/adminSession";
import { writeAudit } from "@/server/services/admin.service";
import { uploadOptionalImage, UploadError } from "@/server/storage";
import { validatePlanShape, type PlanCategory } from "@/server/services/payment.rules";
import type { FormState } from "../master-lists/state";

const PAGE = "plans" as const;

function failure(error: unknown): FormState {
  if (error instanceof UploadError) return { error: error.message };
  if (error instanceof Error) {
    if (error.message === "ADMIN_FORBIDDEN") return { error: "You cannot edit this page." };
    if (error.message === "ADMIN_UNAUTHENTICATED") return { error: "Sign in again." };
    return { error: error.message };
  }
  return { error: "Something went wrong." };
}

function done(message: string): FormState {
  revalidatePath("/admin/plans");
  return { success: message };
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export async function savePlanAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);

    const id = String(formData.get("id") ?? "");
    const category = String(formData.get("category") ?? "") as PlanCategory;
    const label = String(formData.get("label") ?? "").trim();
    const price = numberOrNull(formData.get("price")) ?? 0;
    const creditsGranted = numberOrNull(formData.get("creditsGranted"));
    const boostDays = numberOrNull(formData.get("boostDays"));
    const qrUpiId = String(formData.get("qrUpiId") ?? "").trim() || null;
    const sortOrder = numberOrNull(formData.get("sortOrder")) ?? 0;

    if (!["credits", "seller_chat_unlock", "boost"].includes(category)) {
      return { error: "Unknown plan type." };
    }
    if (!label) return { error: "Give the plan a name students will understand." };

    const shape = validatePlanShape({ category, price, creditsGranted, boostDays });
    if (!shape.ok) return { error: shape.error };

    const qrImageUrl = await uploadOptionalImage(formData.get("qr"), "qr");

    if (id) {
      const before = await prisma.plan.findUnique({ where: { id } });
      const after = await prisma.plan.update({
        where: { id },
        data: {
          label,
          price,
          creditsGranted: category === "credits" ? creditsGranted : null,
          boostDays: category === "boost" ? boostDays : null,
          qrUpiId,
          sortOrder,
          ...(qrImageUrl ? { qrImageUrl } : {}),
        },
      });

      await writeAudit({ adminUserId: admin.id, action: "update", entity: "plan", entityId: id, before, after });
      return done("Plan saved.");
    }

    const created = await prisma.plan.create({
      data: {
        category,
        label,
        price,
        creditsGranted: category === "credits" ? creditsGranted : null,
        boostDays: category === "boost" ? boostDays : null,
        qrImageUrl,
        qrUpiId,
        sortOrder,
      },
    });

    await writeAudit({
      adminUserId: admin.id,
      action: "create",
      entity: "plan",
      entityId: created.id,
      after: created,
    });

    return done(
      qrImageUrl
        ? "Plan added."
        : "Plan added. Upload its QR code before students can pay for it.",
    );
  } catch (error) {
    return failure(error);
  }
}

export async function togglePlanAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);
    const id = String(formData.get("id") ?? "");
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) return { error: "Plan not found." };

    await prisma.plan.update({ where: { id }, data: { isActive: !plan.isActive } });
    await writeAudit({
      adminUserId: admin.id,
      action: plan.isActive ? "deactivate" : "activate",
      entity: "plan",
      entityId: id,
    });

    return done(plan.isActive ? "Plan hidden from students." : "Plan is live.");
  } catch (error) {
    return failure(error);
  }
}

export async function deletePlanAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);
    const id = String(formData.get("id") ?? "");

    const used = await prisma.paymentRequest.count({ where: { planId: id } });
    if (used > 0) {
      return {
        error: "Students have already paid for this plan. Switch it off instead of deleting it.",
      };
    }

    const before = await prisma.plan.findUnique({ where: { id } });
    await prisma.plan.delete({ where: { id } });
    await writeAudit({ adminUserId: admin.id, action: "delete", entity: "plan", entityId: id, before });

    return done("Plan deleted.");
  } catch (error) {
    return failure(error);
  }
}

// ---------------------------------------------------------------------------
// Payment platforms
// ---------------------------------------------------------------------------

export async function savePlatformAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);

    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const utrTerm = String(formData.get("utrTerm") ?? "").trim();
    const appTxnTerm = String(formData.get("appTxnTerm") ?? "").trim() || null;
    const sortOrder = numberOrNull(formData.get("sortOrder")) ?? 0;

    if (!name) return { error: "Name the payment app." };
    if (!utrTerm) {
      return { error: "Say what this app calls the UTR, so students paste the right thing." };
    }

    const logoUrl = await uploadOptionalImage(formData.get("logo"), "logos");
    const explanatoryImageUrl = await uploadOptionalImage(formData.get("explanatory"), "guides");

    if (id) {
      const before = await prisma.paymentPlatform.findUnique({ where: { id } });
      const after = await prisma.paymentPlatform.update({
        where: { id },
        data: {
          name,
          utrTerm,
          appTxnTerm,
          sortOrder,
          ...(logoUrl ? { logoUrl } : {}),
          ...(explanatoryImageUrl ? { explanatoryImageUrl } : {}),
        },
      });

      await writeAudit({
        adminUserId: admin.id,
        action: "update",
        entity: "payment_platform",
        entityId: id,
        before,
        after,
      });

      return done("Payment app saved.");
    }

    const created = await prisma.paymentPlatform.create({
      data: { name, utrTerm, appTxnTerm, sortOrder, logoUrl, explanatoryImageUrl },
    });

    await writeAudit({
      adminUserId: admin.id,
      action: "create",
      entity: "payment_platform",
      entityId: created.id,
      after: created,
    });

    return done("Payment app added.");
  } catch (error) {
    return failure(error);
  }
}

export async function togglePlatformAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);
    const id = String(formData.get("id") ?? "");
    const platform = await prisma.paymentPlatform.findUnique({ where: { id } });
    if (!platform) return { error: "Payment app not found." };

    await prisma.paymentPlatform.update({ where: { id }, data: { isActive: !platform.isActive } });
    await writeAudit({
      adminUserId: admin.id,
      action: platform.isActive ? "deactivate" : "activate",
      entity: "payment_platform",
      entityId: id,
    });

    return done(platform.isActive ? "Payment app hidden." : "Payment app is live.");
  } catch (error) {
    return failure(error);
  }
}
