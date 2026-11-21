import "server-only";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { getSmsProvider } from "@/server/sms";
import { consumeRateLimit } from "./rateLimit.service";
import type { OtpPurpose } from "@/generated/prisma/enums";

export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const SENDS_PER_HOUR = 3;
const SENDS_PER_DAY = 10;

export type OtpSendOutcome =
  | { ok: true; testAccount: boolean; devCode?: string }
  | { ok: false; error: string; retryAfterSeconds?: number };

export type OtpVerifyOutcome =
  | { ok: true }
  | { ok: false; error: string; attemptsLeft?: number };

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Sends an OTP, unless the number belongs to a test account, in which case the
 * admin configured fixed OTP applies and no SMS is triggered (PRD 10.5).
 */
export async function sendOtp(
  phone: string,
  purpose: OtpPurpose = "login",
): Promise<OtpSendOutcome> {
  const testAccount = await prisma.testAccount.findUnique({ where: { phone } });
  if (testAccount) {
    return { ok: true, testAccount: true };
  }

  const cooldown = await consumeRateLimit(`otp:cooldown:${phone}`, 1, RESEND_COOLDOWN_SECONDS);
  if (!cooldown.allowed) {
    return {
      ok: false,
      error: `Please wait ${cooldown.retryAfterSeconds}s before requesting another code.`,
      retryAfterSeconds: cooldown.retryAfterSeconds,
    };
  }

  const hourly = await consumeRateLimit(`otp:hour:${phone}`, SENDS_PER_HOUR, 60 * 60);
  if (!hourly.allowed) {
    return {
      ok: false,
      error: "Too many codes requested for this number. Try again later.",
      retryAfterSeconds: hourly.retryAfterSeconds,
    };
  }

  const daily = await consumeRateLimit(`otp:day:${phone}`, SENDS_PER_DAY, 24 * 60 * 60);
  if (!daily.allowed) {
    return {
      ok: false,
      error: "Daily verification limit reached for this number.",
      retryAfterSeconds: daily.retryAfterSeconds,
    };
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);

  // Any earlier unconsumed code for this number stops being valid.
  await prisma.otpCode.updateMany({
    where: { phone, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.otpCode.create({
    data: {
      phone,
      codeHash,
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
    },
  });

  const provider = getSmsProvider();
  const result = await provider.sendOtp(phone, code);

  if (!result.ok) {
    return { ok: false, error: result.error ?? "Could not send the verification code." };
  }

  return {
    ok: true,
    testAccount: false,
    devCode: provider.name === "mock" ? code : undefined,
  };
}

export async function verifyOtp(phone: string, code: string): Promise<OtpVerifyOutcome> {
  const testAccount = await prisma.testAccount.findUnique({ where: { phone } });
  if (testAccount) {
    return testAccount.fixedOtp === code
      ? { ok: true }
      : { ok: false, error: "Incorrect code." };
  }

  const throttle = await consumeRateLimit(`otp:verify:${phone}`, 10, 10 * 60);
  if (!throttle.allowed) {
    return { ok: false, error: "Too many attempts. Please request a new code." };
  }

  const record = await prisma.otpCode.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, error: "Request a verification code first." };
  if (record.expiresAt < new Date()) {
    return { ok: false, error: "That code has expired. Request a new one." };
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, error: "Too many incorrect attempts. Request a new code." };
  }

  const matches = await bcrypt.compare(code, record.codeHash);
  if (!matches) {
    const updated = await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return {
      ok: false,
      error: "Incorrect code.",
      attemptsLeft: Math.max(OTP_MAX_ATTEMPTS - updated.attempts, 0),
    };
  }

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true };
}
