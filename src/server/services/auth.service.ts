import "server-only";
import { prisma } from "@/server/db";
import { normalizePhone } from "@/lib/text";
import { sendOtp, verifyOtp } from "./otp.service";
import { resolveBranch, resolveCollege } from "./masterlist.service";

export type RequestOtpResult =
  | { ok: true; phone: string; isNewUser: boolean; testAccount: boolean; devCode?: string }
  | { ok: false; error: string };

export async function requestOtpForPhone(rawPhone: string): Promise<RequestOtpResult> {
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return { ok: false, error: "Enter a valid 10 digit Indian mobile number." };
  }

  const [user, testAccount] = await Promise.all([
    prisma.user.findUnique({ where: { phone } }),
    prisma.testAccount.findUnique({ where: { phone } }),
  ]);

  if (user?.status === "blocked") {
    return { ok: false, error: "This account has been blocked. Contact support." };
  }

  const outcome = await sendOtp(phone, user ? "login" : "register");
  if (!outcome.ok) return { ok: false, error: outcome.error };

  // A test account that has not been onboarded yet, or that the admin flagged
  // for re-onboarding, goes through the profile step like a new user.
  const needsProfile = !user || (testAccount?.redoOnboarding ?? false);

  return {
    ok: true,
    phone,
    isNewUser: needsProfile,
    testAccount: Boolean(testAccount),
    devCode: outcome.ok && "devCode" in outcome ? outcome.devCode : undefined,
  };
}

export type VerifyResult =
  | { ok: true; userId: string | null; phone: string }
  | { ok: false; error: string };

export async function verifyOtpForPhone(
  rawPhone: string,
  code: string,
): Promise<VerifyResult> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: "Enter a valid mobile number." };
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Enter the 6 digit code." };

  const outcome = await verifyOtp(phone, code);
  if (!outcome.ok) return { ok: false, error: outcome.error };

  const user = await prisma.user.findUnique({ where: { phone } });
  if (user) {
    if (user.status === "blocked") {
      return { ok: false, error: "This account has been blocked. Contact support." };
    }
    return { ok: true, userId: user.id, phone };
  }

  return { ok: true, userId: null, phone };
}

export type RegistrationInput = {
  phone: string;
  name: string;
  lastName?: string;
  college: string;
  branch: string;
  graduationYear: number;
};

export async function completeRegistration(input: RegistrationInput) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Invalid phone number");

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return existing;

  const testAccount = await prisma.testAccount.findUnique({ where: { phone } });

  const college = await resolveCollege(input.college);
  const branch = await resolveBranch(input.branch);

  const user = await prisma.user.create({
    data: {
      phone,
      name: input.name.trim(),
      lastName: input.lastName?.trim() || null,
      graduationYear: input.graduationYear,
      collegeId: college.id,
      collegeText: college.text,
      branchId: branch.id,
      branchText: branch.text,
      isTestAccount: Boolean(testAccount),
    },
  });

  // Attribute the master list requests raised above to the new user.
  await prisma.masterListRequest.updateMany({
    where: {
      submittedByUserId: null,
      status: "pending",
      OR: [
        ...(college.isNew ? [{ listType: "college" as const, submittedText: college.text }] : []),
        ...(branch.isNew ? [{ listType: "branch" as const, submittedText: branch.text }] : []),
      ],
    },
    data: { submittedByUserId: user.id },
  });

  if (testAccount?.redoOnboarding) {
    await prisma.testAccount.update({
      where: { id: testAccount.id },
      data: { redoOnboarding: false },
    });
  }

  return user;
}
