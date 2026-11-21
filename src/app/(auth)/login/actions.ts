"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import {
  completeRegistration,
  requestOtpForPhone,
  verifyOtpForPhone,
} from "@/server/services/auth.service";
import { createUserSession } from "@/server/auth/session";
import {
  clearRegistrationTicket,
  issueRegistrationTicket,
  readRegistrationTicket,
} from "@/server/auth/registrationTicket";

export type AuthStep = "phone" | "otp" | "profile";

export type AuthState = {
  step: AuthStep;
  phone: string;
  /** Present only while SMS_PROVIDER=mock, so development can sign in. */
  devCode?: string;
  error?: string;
};

export const initialAuthState: AuthState = { step: "phone", phone: "" };

const codeSchema = z.string().regex(/^\d{6}$/, "Enter the 6 digit code.");

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(60),
  lastName: z.string().trim().max(60).optional(),
  college: z.string().trim().min(2, "Enter your university or college."),
  branch: z.string().trim().min(2, "Enter your branch."),
  graduationYear: z
    .number()
    .int("Enter a valid year.")
    .min(new Date().getFullYear() - 10, "Enter a valid year.")
    .max(new Date().getFullYear() + 10, "Enter a valid year."),
});

/**
 * One server action drives the whole sign in state machine, so the client holds
 * no duplicated state and needs no effects.
 */
export async function authAction(prev: AuthState, formData: FormData): Promise<AuthState> {
  const intent = String(formData.get("intent") ?? "");

  if (intent === "change_number") {
    return { step: "phone", phone: prev.phone };
  }

  if (intent === "request_otp" || intent === "resend_otp") {
    const phoneInput =
      intent === "resend_otp" ? prev.phone : String(formData.get("phone") ?? "");

    const result = await requestOtpForPhone(phoneInput);
    if (!result.ok) {
      return { ...prev, step: intent === "resend_otp" ? "otp" : "phone", error: result.error };
    }

    return { step: "otp", phone: result.phone, devCode: result.devCode };
  }

  if (intent === "verify_otp") {
    const parsed = codeSchema.safeParse(String(formData.get("code") ?? ""));
    if (!parsed.success) {
      return { ...prev, step: "otp", error: parsed.error.issues[0].message };
    }

    const result = await verifyOtpForPhone(prev.phone, parsed.data);
    if (!result.ok) return { ...prev, step: "otp", error: result.error };

    if (result.userId) {
      const userAgent = (await headers()).get("user-agent") ?? undefined;
      await createUserSession(result.userId, userAgent);
      redirect("/buy");
    }

    await issueRegistrationTicket(result.phone);
    return { step: "profile", phone: result.phone };
  }

  if (intent === "complete_profile") {
    const phone = await readRegistrationTicket();
    if (!phone) {
      return {
        step: "phone",
        phone: prev.phone,
        error: "That took a while. Please verify your number again.",
      };
    }

    const parsed = profileSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      lastName: String(formData.get("lastName") ?? "") || undefined,
      college: String(formData.get("college") ?? ""),
      branch: String(formData.get("branch") ?? ""),
      graduationYear: Number(formData.get("graduationYear") ?? 0),
    });

    if (!parsed.success) {
      return { ...prev, step: "profile", error: parsed.error.issues[0].message };
    }

    const user = await completeRegistration({ phone, ...parsed.data });
    await clearRegistrationTicket();

    const userAgent = (await headers()).get("user-agent") ?? undefined;
    await createUserSession(user.id, userAgent);
    redirect("/buy");
  }

  return prev;
}
