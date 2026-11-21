import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/server/db";
import { env } from "@/lib/env";
import { signAccessToken, verifyAccessToken } from "./jwt";

const ADMIN_ACCESS_COOKIE = "buyel_admin_at";
const ADMIN_REFRESH_COOKIE = "buyel_admin_rt";
const REFRESH_TTL_DAYS = 7;

/** Every page an employee account can be scoped to. Keep in sync with the seed. */
export const ADMIN_PAGES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "master_lists", label: "Colleges, branches and courses" },
  { key: "payment_platforms", label: "Payment platforms" },
  { key: "plans", label: "Plans and QR codes" },
  { key: "payments", label: "Payment verification" },
  { key: "users", label: "Users" },
  { key: "listings", label: "Listings" },
  { key: "user_access", label: "User access" },
] as const;

export type AdminPageKey = (typeof ADMIN_PAGES)[number]["key"];

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax" as const,
  path: "/",
};

export async function createAdminSession(adminUserId: string) {
  const refreshToken = randomBytes(48).toString("base64url");

  await prisma.adminSession.create({
    data: {
      adminUserId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  const accessToken = await signAccessToken({ sub: adminUserId, kind: "admin" });
  const jar = await cookies();
  jar.set(ADMIN_ACCESS_COOKIE, accessToken, { ...cookieOptions, maxAge: 15 * 60 });
  jar.set(ADMIN_REFRESH_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function destroyAdminSession() {
  const jar = await cookies();
  const refreshToken = jar.get(ADMIN_REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await prisma.adminSession.updateMany({
      where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  jar.delete(ADMIN_ACCESS_COOKIE);
  jar.delete(ADMIN_REFRESH_COOKIE);
}

export type CurrentAdmin = {
  id: string;
  username: string;
  name: string;
  role: "owner" | "employee";
  permissions: { pageKey: string; canView: boolean; canEdit: boolean }[];
};

async function loadAdmin(adminUserId: string): Promise<CurrentAdmin | null> {
  const admin = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    include: { permissions: true },
  });

  if (!admin || !admin.isActive) return null;

  return {
    id: admin.id,
    username: admin.username,
    name: admin.name,
    role: admin.role,
    permissions: admin.permissions.map((permission) => ({
      pageKey: permission.pageKey,
      canView: permission.canView,
      canEdit: permission.canEdit,
    })),
  };
}

export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const jar = await cookies();

  const accessToken = jar.get(ADMIN_ACCESS_COOKIE)?.value;
  if (accessToken) {
    const claims = await verifyAccessToken(accessToken);
    if (claims?.kind === "admin") return loadAdmin(claims.sub);
  }

  const refreshToken = jar.get(ADMIN_REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const session = await prisma.adminSession.findUnique({
    where: { refreshTokenHash: hashToken(refreshToken) },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  return loadAdmin(session.adminUserId);
});

/** The owner always has every page; employees only what was granted. */
export function canView(admin: CurrentAdmin, pageKey: AdminPageKey): boolean {
  if (admin.role === "owner") return true;
  return admin.permissions.some((p) => p.pageKey === pageKey && p.canView);
}

export function canEdit(admin: CurrentAdmin, pageKey: AdminPageKey): boolean {
  if (admin.role === "owner") return true;
  return admin.permissions.some((p) => p.pageKey === pageKey && p.canEdit);
}

export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("ADMIN_UNAUTHENTICATED");
  return admin;
}

/** Throws unless the signed in admin may edit that page. Used by every action. */
export async function requireEditor(pageKey: AdminPageKey): Promise<CurrentAdmin> {
  const admin = await requireAdmin();
  if (!canEdit(admin, pageKey)) throw new Error("ADMIN_FORBIDDEN");
  return admin;
}
