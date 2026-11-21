import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/server/db";
import { env } from "@/lib/env";
import { signAccessToken, verifyAccessToken } from "./jwt";

const ACCESS_COOKIE = "buyel_at";
const REFRESH_COOKIE = "buyel_rt";
const REFRESH_TTL_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax" as const,
  path: "/",
};

export async function createUserSession(userId: string, userAgent?: string) {
  const refreshToken = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: hashToken(refreshToken),
      userAgent: userAgent?.slice(0, 250),
      expiresAt,
    },
  });

  const accessToken = await signAccessToken({ sub: userId, kind: "user" });
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, accessToken, { ...cookieOptions, maxAge: 15 * 60 });
  jar.set(REFRESH_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function destroyUserSession() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await prisma.session.updateMany({
      where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

/**
 * Resolves the signed in user for the current request. Falls back to the
 * refresh token when the short lived access token has expired.
 */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();

  const accessToken = jar.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    const claims = await verifyAccessToken(accessToken);
    if (claims?.kind === "user") {
      const user = await prisma.user.findUnique({ where: { id: claims.sub } });
      if (user && user.status === "active") return user;
      return null;
    }
  }

  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hashToken(refreshToken) },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (session.user.status !== "active") return null;

  return session.user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export const sessionCookieNames = { ACCESS_COOKIE, REFRESH_COOKIE };
