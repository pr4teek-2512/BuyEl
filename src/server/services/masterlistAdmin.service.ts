import "server-only";
import { prisma } from "@/server/db";
import { deriveAbbreviation, normalizeName } from "@/lib/text";
import { writeAudit } from "./admin.service";
import type { BranchLevel } from "@/generated/prisma/enums";

/**
 * Admin side management of the three master lists (PRD 16.3 and 10.1).
 * Everything here is an admin write, so everything is audited.
 */

const PAGE_SIZE = 25;

export type ListQuery = { search?: string; page?: number };

export async function listColleges({ search = "", page = 1 }: ListQuery) {
  const where = search.trim()
    ? {
        OR: [
          { name: { contains: search.trim(), mode: "insensitive" as const } },
          { abbreviation: { contains: search.trim(), mode: "insensitive" as const } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.college.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.college.count({ where }),
  ]);

  return { rows, total, page, pageSize: PAGE_SIZE };
}

export async function listBranches({ search = "", page = 1 }: ListQuery) {
  const where = search.trim()
    ? { name: { contains: search.trim(), mode: "insensitive" as const } }
    : {};

  const [rows, total] = await Promise.all([
    prisma.branch.findMany({
      where,
      orderBy: [{ level: "asc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.branch.count({ where }),
  ]);

  return { rows, total, page, pageSize: PAGE_SIZE };
}

export async function listCourses({ search = "", page = 1 }: ListQuery) {
  const where = search.trim()
    ? { name: { contains: search.trim(), mode: "insensitive" as const } }
    : {};

  const [rows, total] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.course.count({ where }),
  ]);

  return { rows, total, page, pageSize: PAGE_SIZE };
}

export async function listPendingRequests() {
  return prisma.masterListRequest.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    include: {
      submittedBy: { select: { id: true, name: true, lastName: true, phone: true } },
    },
  });
}

export async function countPendingRequests() {
  return prisma.masterListRequest.count({ where: { status: "pending" } });
}

// ---------------------------------------------------------------------------
// Colleges
// ---------------------------------------------------------------------------

export async function createCollege(
  adminUserId: string,
  input: { name: string; abbreviation?: string },
) {
  const name = input.name.trim();
  const normalizedName = normalizeName(name);
  if (!normalizedName) throw new Error("Enter a college name.");

  const existing = await prisma.college.findUnique({ where: { normalizedName } });
  if (existing) throw new Error("That college is already in the master list.");

  const college = await prisma.college.create({
    data: {
      name,
      abbreviation: input.abbreviation?.trim() || deriveAbbreviation(name),
      normalizedName,
    },
  });

  await relinkCollege(college.id, college.name, normalizedName);
  await writeAudit({
    adminUserId,
    action: "create",
    entity: "college",
    entityId: college.id,
    after: college,
  });

  return college;
}

export async function updateCollege(
  adminUserId: string,
  id: string,
  input: { name: string; abbreviation: string },
) {
  const before = await prisma.college.findUnique({ where: { id } });
  if (!before) throw new Error("College not found.");

  const name = input.name.trim();
  const normalizedName = normalizeName(name);

  const clash = await prisma.college.findUnique({ where: { normalizedName } });
  if (clash && clash.id !== id) throw new Error("Another college already uses that name.");

  const after = await prisma.college.update({
    where: { id },
    data: { name, abbreviation: input.abbreviation.trim() || deriveAbbreviation(name), normalizedName },
  });

  // Everyone linked to this college sees the corrected name immediately.
  await prisma.user.updateMany({ where: { collegeId: id }, data: { collegeText: after.name } });
  await prisma.listing.updateMany({ where: { collegeId: id }, data: { collegeText: after.name } });

  await writeAudit({ adminUserId, action: "update", entity: "college", entityId: id, before, after });
  return after;
}

export async function deleteCollege(adminUserId: string, id: string) {
  const before = await prisma.college.findUnique({ where: { id } });
  if (!before) throw new Error("College not found.");

  // onDelete: SetNull keeps the users and listings, they simply become unlinked
  // free text again rather than losing the value the student typed.
  await prisma.college.delete({ where: { id } });
  await writeAudit({ adminUserId, action: "delete", entity: "college", entityId: id, before });
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

export async function createBranch(
  adminUserId: string,
  input: { name: string; level: BranchLevel },
) {
  const name = input.name.trim();
  const normalizedName = normalizeName(name);
  if (!normalizedName) throw new Error("Enter a branch name.");

  const existing = await prisma.branch.findUnique({ where: { normalizedName } });
  if (existing) throw new Error("That branch is already in the master list.");

  const branch = await prisma.branch.create({
    data: { name, level: input.level, normalizedName },
  });

  await prisma.user.updateMany({
    where: { branchId: null, branchText: { equals: name, mode: "insensitive" } },
    data: { branchId: branch.id, branchText: branch.name },
  });

  await writeAudit({
    adminUserId,
    action: "create",
    entity: "branch",
    entityId: branch.id,
    after: branch,
  });

  return branch;
}

export async function updateBranch(
  adminUserId: string,
  id: string,
  input: { name: string; level: BranchLevel },
) {
  const before = await prisma.branch.findUnique({ where: { id } });
  if (!before) throw new Error("Branch not found.");

  const name = input.name.trim();
  const normalizedName = normalizeName(name);

  const clash = await prisma.branch.findUnique({ where: { normalizedName } });
  if (clash && clash.id !== id) throw new Error("Another branch already uses that name.");

  const after = await prisma.branch.update({
    where: { id },
    data: { name, level: input.level, normalizedName },
  });

  await prisma.user.updateMany({ where: { branchId: id }, data: { branchText: after.name } });
  await writeAudit({ adminUserId, action: "update", entity: "branch", entityId: id, before, after });
  return after;
}

export async function deleteBranch(adminUserId: string, id: string) {
  const before = await prisma.branch.findUnique({ where: { id } });
  if (!before) throw new Error("Branch not found.");

  await prisma.branch.delete({ where: { id } });
  await writeAudit({ adminUserId, action: "delete", entity: "branch", entityId: id, before });
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export async function createCourse(adminUserId: string, input: { name: string }) {
  const name = input.name.trim();
  const normalizedName = normalizeName(name);
  if (!normalizedName) throw new Error("Enter a course name.");

  const existing = await prisma.course.findFirst({ where: { normalizedName } });
  if (existing) throw new Error("That course is already in the master list.");

  const course = await prisma.course.create({ data: { name, normalizedName } });

  await prisma.listing.updateMany({
    where: { courseId: null, courseText: { equals: name, mode: "insensitive" } },
    data: { courseId: course.id, courseText: course.name },
  });

  await writeAudit({
    adminUserId,
    action: "create",
    entity: "course",
    entityId: course.id,
    after: course,
  });

  return course;
}

export async function updateCourse(adminUserId: string, id: string, input: { name: string }) {
  const before = await prisma.course.findUnique({ where: { id } });
  if (!before) throw new Error("Course not found.");

  const name = input.name.trim();
  const normalizedName = normalizeName(name);

  const clash = await prisma.course.findFirst({ where: { normalizedName } });
  if (clash && clash.id !== id) throw new Error("Another course already uses that name.");

  const after = await prisma.course.update({
    where: { id },
    data: { name, normalizedName },
  });

  await prisma.listing.updateMany({ where: { courseId: id }, data: { courseText: after.name } });
  await writeAudit({ adminUserId, action: "update", entity: "course", entityId: id, before, after });
  return after;
}

export async function deleteCourse(adminUserId: string, id: string) {
  const before = await prisma.course.findUnique({ where: { id } });
  if (!before) throw new Error("Course not found.");

  await prisma.course.delete({ where: { id } });
  await writeAudit({ adminUserId, action: "delete", entity: "course", entityId: id, before });
}

/**
 * When a college joins the official list, every user and listing that typed the
 * same text is linked to it, so the data converges instead of drifting.
 */
async function relinkCollege(collegeId: string, name: string, normalizedName: string) {
  const candidates = await prisma.user.findMany({
    where: { collegeId: null },
    select: { id: true, collegeText: true },
  });

  const matchingUserIds = candidates
    .filter((row) => normalizeName(row.collegeText) === normalizedName)
    .map((row) => row.id);

  if (matchingUserIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: matchingUserIds } },
      data: { collegeId, collegeText: name },
    });
  }

  const listings = await prisma.listing.findMany({
    where: { collegeId: null },
    select: { id: true, collegeText: true },
  });

  const matchingListingIds = listings
    .filter((row) => normalizeName(row.collegeText) === normalizedName)
    .map((row) => row.id);

  if (matchingListingIds.length > 0) {
    await prisma.listing.updateMany({
      where: { id: { in: matchingListingIds } },
      data: { collegeId, collegeText: name },
    });
  }
}
