import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { consumeRateLimit } from "./rateLimit.service";

export type AdminLoginResult =
  | { ok: true; adminUserId: string }
  | { ok: false; error: string };

export async function adminLogin(
  username: string,
  password: string,
): Promise<AdminLoginResult> {
  const cleanUsername = username.trim().toLowerCase();

  const throttle = await consumeRateLimit(`admin:login:${cleanUsername}`, 10, 15 * 60);
  if (!throttle.allowed) {
    return { ok: false, error: "Too many attempts. Try again in a few minutes." };
  }

  const admin = await prisma.adminUser.findUnique({ where: { username: cleanUsername } });

  // Same message either way, so the form never reveals which usernames exist.
  const invalid = { ok: false, error: "Incorrect username or password." } as const;
  if (!admin || !admin.isActive) {
    await bcrypt.compare(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    return invalid;
  }

  const matches = await bcrypt.compare(password, admin.passwordHash);
  if (!matches) return invalid;

  return { ok: true, adminUserId: admin.id };
}

/** Every admin write goes through here, so the panel keeps a full history. */
export async function writeAudit(params: {
  adminUserId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: params.adminUserId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      beforeJson: params.before === undefined ? undefined : (params.before as never),
      afterJson: params.after === undefined ? undefined : (params.after as never),
    },
  });
}
