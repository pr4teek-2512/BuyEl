import "server-only";
import { prisma } from "@/server/db";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Fixed window counter stored in Postgres. Keeps the deployment to one database
 * and no extra service, which is enough for OTP and login throttling volumes.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const windowMs = windowSeconds * 1000;

  const existing = await prisma.rateLimit.findUnique({ where: { key } });

  if (!existing || now.getTime() - existing.windowStart.getTime() >= windowMs) {
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now },
      update: { count: 1, windowStart: now },
    });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    const retryAfter = Math.ceil(
      (existing.windowStart.getTime() + windowMs - now.getTime()) / 1000,
    );
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(retryAfter, 1) };
  }

  const updated = await prisma.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });

  return {
    allowed: true,
    remaining: Math.max(limit - updated.count, 0),
    retryAfterSeconds: 0,
  };
}

export async function peekRateLimit(key: string): Promise<number> {
  const existing = await prisma.rateLimit.findUnique({ where: { key } });
  return existing?.count ?? 0;
}
