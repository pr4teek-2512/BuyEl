import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { ADMIN_PAGES } from "@/server/auth/adminSession";
import { writeAudit } from "./admin.service";
import { normalizePhone, toLooseE164 } from "@/lib/text";

export class AdminAccountError extends Error {}

const PAGE_KEYS = new Set(ADMIN_PAGES.map((page) => page.key as string));

export type PermissionInput = { pageKey: string; canView: boolean; canEdit: boolean };

function validatePassword(password: string) {
  if (password.length < 8) {
    throw new AdminAccountError("Use a password of at least 8 characters.");
  }
}

function cleanUsername(raw: string) {
  const username = raw.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    throw new AdminAccountError(
      "Usernames are 3 to 30 characters: letters, numbers, dot, dash or underscore.",
    );
  }
  return username;
}

export async function listAdminUsers() {
  return prisma.adminUser.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: { permissions: true },
  });
}

export async function createEmployee(
  actingAdminId: string,
  input: { name: string; username: string; password: string; permissions: PermissionInput[] },
) {
  const name = input.name.trim();
  if (name.length < 2) throw new AdminAccountError("Enter the employee's name.");

  const username = cleanUsername(input.username);
  validatePassword(input.password);

  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) throw new AdminAccountError("That username is already taken.");

  const granted = input.permissions.filter(
    (permission) => PAGE_KEYS.has(permission.pageKey) && (permission.canView || permission.canEdit),
  );

  if (granted.length === 0) {
    throw new AdminAccountError("Give the employee access to at least one page.");
  }

  const employee = await prisma.adminUser.create({
    data: {
      name,
      username,
      role: "employee",
      passwordHash: await bcrypt.hash(input.password, 12),
      permissions: {
        create: granted.map((permission) => ({
          pageKey: permission.pageKey,
          // Edit access implies being able to see the page.
          canView: permission.canView || permission.canEdit,
          canEdit: permission.canEdit,
        })),
      },
    },
  });

  await writeAudit({
    adminUserId: actingAdminId,
    action: "create",
    entity: "admin_user",
    entityId: employee.id,
    after: { username, name, pages: granted },
  });

  return employee;
}

export async function updateEmployee(
  actingAdminId: string,
  employeeId: string,
  input: { name: string; password?: string; permissions: PermissionInput[] },
) {
  const employee = await prisma.adminUser.findUnique({
    where: { id: employeeId },
    include: { permissions: true },
  });

  if (!employee) throw new AdminAccountError("Account not found.");
  if (employee.role === "owner") {
    throw new AdminAccountError("Use the owner form to change the owner account.");
  }

  const name = input.name.trim();
  if (name.length < 2) throw new AdminAccountError("Enter the employee's name.");

  if (input.password) validatePassword(input.password);

  const granted = input.permissions.filter(
    (permission) => PAGE_KEYS.has(permission.pageKey) && (permission.canView || permission.canEdit),
  );

  if (granted.length === 0) {
    throw new AdminAccountError("Give the employee access to at least one page.");
  }

  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: employeeId },
      data: {
        name,
        ...(input.password ? { passwordHash: await bcrypt.hash(input.password, 12) } : {}),
      },
    }),
    prisma.adminPermission.deleteMany({ where: { adminUserId: employeeId } }),
    prisma.adminPermission.createMany({
      data: granted.map((permission) => ({
        adminUserId: employeeId,
        pageKey: permission.pageKey,
        canView: permission.canView || permission.canEdit,
        canEdit: permission.canEdit,
      })),
    }),
  ]);

  await writeAudit({
    adminUserId: actingAdminId,
    action: "update",
    entity: "admin_user",
    entityId: employeeId,
    before: { name: employee.name, pages: employee.permissions },
    after: { name, pages: granted },
  });
}

export async function deleteEmployee(actingAdminId: string, employeeId: string) {
  const employee = await prisma.adminUser.findUnique({ where: { id: employeeId } });
  if (!employee) throw new AdminAccountError("Account not found.");
  if (employee.role === "owner") throw new AdminAccountError("The owner cannot be deleted.");

  await prisma.adminUser.delete({ where: { id: employeeId } });
  await writeAudit({
    adminUserId: actingAdminId,
    action: "delete",
    entity: "admin_user",
    entityId: employeeId,
    before: { username: employee.username, name: employee.name },
  });
}

/**
 * Owner account changes are confirmed with an OTP to the number the owner
 * nominated, so a borrowed admin session cannot take over the top account.
 */
export async function updateOwner(
  ownerId: string,
  input: { name: string; username: string; password?: string },
) {
  const owner = await prisma.adminUser.findUnique({ where: { id: ownerId } });
  if (!owner || owner.role !== "owner") throw new AdminAccountError("Owner account not found.");

  const name = input.name.trim();
  if (name.length < 2) throw new AdminAccountError("Enter a name.");

  const username = cleanUsername(input.username);
  const clash = await prisma.adminUser.findUnique({ where: { username } });
  if (clash && clash.id !== ownerId) throw new AdminAccountError("That username is taken.");

  if (input.password) validatePassword(input.password);

  await prisma.adminUser.update({
    where: { id: ownerId },
    data: {
      name,
      username,
      ...(input.password ? { passwordHash: await bcrypt.hash(input.password, 12) } : {}),
    },
  });

  await writeAudit({
    adminUserId: ownerId,
    action: "update_owner",
    entity: "admin_user",
    entityId: ownerId,
    before: { username: owner.username, name: owner.name },
    after: { username, name, passwordChanged: Boolean(input.password) },
  });
}

// ---------------------------------------------------------------------------
// Test accounts (PRD 10.5)
// ---------------------------------------------------------------------------

export async function listTestAccounts() {
  return prisma.testAccount.findMany({ orderBy: { createdAt: "asc" } });
}

function cleanFixedOtp(raw: string) {
  const otp = raw.trim();
  if (!/^\d{6}$/.test(otp)) throw new AdminAccountError("The fixed OTP must be 6 digits.");
  return otp;
}

/** A test account may use a number that is not a real mobile number. */
function cleanTestPhone(raw: string) {
  const phone = normalizePhone(raw) ?? toLooseE164(raw);
  if (!phone) throw new AdminAccountError("Enter a number with at least 8 digits.");
  return phone;
}

export async function saveTestAccount(
  actingAdminId: string,
  input: {
    id?: string;
    name: string;
    phone: string;
    fixedOtp: string;
    canAccessPaidServices: boolean;
    testModeOn: boolean;
    redoOnboarding: boolean;
  },
) {
  const name = input.name.trim();
  if (name.length < 2) throw new AdminAccountError("Name the test account.");

  const phone = cleanTestPhone(input.phone);
  const fixedOtp = cleanFixedOtp(input.fixedOtp);

  const data = {
    name,
    phone,
    fixedOtp,
    canAccessPaidServices: input.canAccessPaidServices,
    testModeOn: input.testModeOn,
    redoOnboarding: input.redoOnboarding,
  };

  if (input.id) {
    const before = await prisma.testAccount.findUnique({ where: { id: input.id } });
    if (!before) throw new AdminAccountError("Test account not found.");

    const clash = await prisma.testAccount.findUnique({ where: { phone } });
    if (clash && clash.id !== input.id) {
      throw new AdminAccountError("Another test account already uses that number.");
    }

    const after = await prisma.testAccount.update({ where: { id: input.id }, data });
    await writeAudit({
      adminUserId: actingAdminId,
      action: "update",
      entity: "test_account",
      entityId: input.id,
      before,
      after,
    });
    return after;
  }

  const clash = await prisma.testAccount.findUnique({ where: { phone } });
  if (clash) throw new AdminAccountError("A test account already uses that number.");

  const created = await prisma.testAccount.create({ data });
  await writeAudit({
    adminUserId: actingAdminId,
    action: "create",
    entity: "test_account",
    entityId: created.id,
    after: created,
  });

  return created;
}

export async function deleteTestAccount(actingAdminId: string, id: string) {
  const account = await prisma.testAccount.findUnique({ where: { id } });
  if (!account) throw new AdminAccountError("Test account not found.");

  await prisma.testAccount.delete({ where: { id } });

  // The student row stays, so any listings and chats it made are still there.
  await writeAudit({
    adminUserId: actingAdminId,
    action: "delete",
    entity: "test_account",
    entityId: id,
    before: account,
  });
}
