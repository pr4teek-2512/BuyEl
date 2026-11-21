import "server-only";
import { prisma } from "@/server/db";
import { deriveAbbreviation, normalizeName } from "@/lib/text";
import { writeAudit } from "./admin.service";
import type { MasterListType } from "@/generated/prisma/enums";

export type Suggestion = {
  id: string;
  label: string;
  hint?: string;
};

/**
 * Resolution of a free text value typed by a user into one of the master lists.
 *
 * PRD section 16.2:
 *  - an exact match ignoring case links to the official entry, no request raised
 *  - anything else is usable immediately and raises a pending admin request
 */
export type Resolution = {
  id: string | null;
  text: string;
  isNew: boolean;
};

export async function suggestColleges(query: string, limit = 8): Promise<Suggestion[]> {
  const q = query.trim();
  if (q.length === 0) return [];

  const rows = await prisma.college.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { abbreviation: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return rows.map((row) => ({ id: row.id, label: row.name, hint: row.abbreviation }));
}

export async function suggestBranches(query: string, limit = 8): Promise<Suggestion[]> {
  const q = query.trim();
  if (q.length === 0) return [];

  const rows = await prisma.branch.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: limit,
  });

  return rows.map((row) => ({ id: row.id, label: row.name, hint: row.level }));
}

export async function suggestCourses(query: string, limit = 8): Promise<Suggestion[]> {
  const q = query.trim();
  if (q.length === 0) return [];

  const rows = await prisma.course.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: limit,
  });

  return rows.map((row) => ({ id: row.id, label: row.name }));
}

export async function resolveCollege(input: string, userId?: string): Promise<Resolution> {
  const text = input.trim();
  const normalized = normalizeName(text);
  if (!normalized) return { id: null, text, isNew: false };

  const exact = await prisma.college.findUnique({ where: { normalizedName: normalized } });
  if (exact) return { id: exact.id, text: exact.name, isNew: false };

  const byAbbreviation = await prisma.college.findFirst({
    where: { abbreviation: { equals: text, mode: "insensitive" } },
  });
  if (byAbbreviation) return { id: byAbbreviation.id, text: byAbbreviation.name, isNew: false };

  await raiseRequest("college", text, normalized, userId);
  return { id: null, text, isNew: true };
}

export async function resolveBranch(input: string, userId?: string): Promise<Resolution> {
  const text = input.trim();
  const normalized = normalizeName(text);
  if (!normalized) return { id: null, text, isNew: false };

  const exact = await prisma.branch.findUnique({ where: { normalizedName: normalized } });
  if (exact) return { id: exact.id, text: exact.name, isNew: false };

  await raiseRequest("branch", text, normalized, userId);
  return { id: null, text, isNew: true };
}

export async function resolveCourse(
  input: string,
  options: { userId?: string; listingId?: string; collegeId?: string | null } = {},
): Promise<Resolution> {
  const text = input.trim();
  const normalized = normalizeName(text);
  if (!normalized) return { id: null, text, isNew: false };

  const exact = await prisma.course.findFirst({
    where: { normalizedName: normalized },
    orderBy: { createdAt: "asc" },
  });
  if (exact) return { id: exact.id, text: exact.name, isNew: false };

  await raiseRequest("course", text, normalized, options.userId, options.listingId);
  return { id: null, text, isNew: true };
}

async function raiseRequest(
  listType: MasterListType,
  submittedText: string,
  normalizedText: string,
  userId?: string,
  listingId?: string,
) {
  const duplicate = await prisma.masterListRequest.findFirst({
    where: { listType, normalizedText, status: "pending" },
  });
  if (duplicate) return;

  await prisma.masterListRequest.create({
    data: {
      listType,
      submittedText,
      normalizedText,
      submittedByUserId: userId ?? null,
      listingId: listingId ?? null,
    },
  });
}

/**
 * Admin action 1 in PRD 16.3. Adds the entry to the official master list,
 * optionally corrected first, then relinks every user and listing that typed
 * the same text so the data converges on the official row.
 */
export async function addRequestToMasterList(
  requestId: string,
  adminId: string,
  correctedText?: string,
  extra?: { abbreviation?: string; level?: "UG" | "PG" },
) {
  const request = await prisma.masterListRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Request not found");

  const finalText = (correctedText ?? request.submittedText).trim();
  const normalized = normalizeName(finalText);

  if (request.listType === "college") {
    const college = await prisma.college.upsert({
      where: { normalizedName: normalized },
      create: {
        name: finalText,
        abbreviation: extra?.abbreviation?.trim() || deriveAbbreviation(finalText),
        normalizedName: normalized,
      },
      update: {
        name: finalText,
        ...(extra?.abbreviation ? { abbreviation: extra.abbreviation.trim() } : {}),
      },
    });

    await prisma.user.updateMany({
      where: { collegeId: null, collegeText: { equals: request.submittedText, mode: "insensitive" } },
      data: { collegeId: college.id, collegeText: college.name },
    });
    await prisma.listing.updateMany({
      where: { collegeId: null, collegeText: { equals: request.submittedText, mode: "insensitive" } },
      data: { collegeId: college.id, collegeText: college.name },
    });
  }

  if (request.listType === "branch") {
    const branch = await prisma.branch.upsert({
      where: { normalizedName: normalized },
      create: { name: finalText, level: extra?.level ?? "UG", normalizedName: normalized },
      update: { name: finalText, ...(extra?.level ? { level: extra.level } : {}) },
    });

    await prisma.user.updateMany({
      where: { branchId: null, branchText: { equals: request.submittedText, mode: "insensitive" } },
      data: { branchId: branch.id, branchText: branch.name },
    });
  }

  if (request.listType === "course") {
    const existing = await prisma.course.findFirst({ where: { normalizedName: normalized } });
    const course =
      existing ??
      (await prisma.course.create({
        data: { name: finalText, normalizedName: normalized },
      }));

    await prisma.listing.updateMany({
      where: { courseId: null, courseText: { equals: request.submittedText, mode: "insensitive" } },
      data: { courseId: course.id, courseText: course.name },
    });
  }

  await prisma.masterListRequest.update({
    where: { id: requestId },
    data: {
      status: "added",
      resolvedText: finalText,
      resolvedByAdminId: adminId,
      resolvedAt: new Date(),
    },
  });

  await writeAudit({
    adminUserId: adminId,
    action: "master_request_added",
    entity: request.listType,
    entityId: requestId,
    before: { submittedText: request.submittedText },
    after: { resolvedText: finalText },
  });
}

/** Admin action 2 in PRD 16.3. Drops the request, leaves the user value alone. */
export async function ignoreRequest(requestId: string, adminId: string) {
  const request = await prisma.masterListRequest.update({
    where: { id: requestId },
    data: { status: "ignored", resolvedByAdminId: adminId, resolvedAt: new Date() },
  });

  await writeAudit({
    adminUserId: adminId,
    action: "master_request_ignored",
    entity: request.listType,
    entityId: requestId,
    before: { submittedText: request.submittedText },
  });
}

/**
 * Admin action 3 in PRD 16.3. Corrects what the user sees without promoting the
 * value into the official master list.
 */
export async function modifyUserEntryOnly(
  requestId: string,
  adminId: string,
  correctedText: string,
) {
  const request = await prisma.masterListRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Request not found");

  const finalText = correctedText.trim();
  const normalized = normalizeName(finalText);

  // If the correction happens to match an entry that is already official, link
  // to it as well. The master list itself is still left untouched.
  const existingCollege =
    request.listType === "college"
      ? await prisma.college.findUnique({ where: { normalizedName: normalized } })
      : null;
  const existingBranch =
    request.listType === "branch"
      ? await prisma.branch.findUnique({ where: { normalizedName: normalized } })
      : null;
  const existingCourse =
    request.listType === "course"
      ? await prisma.course.findFirst({ where: { normalizedName: normalized } })
      : null;

  if (request.listType === "college") {
    await prisma.user.updateMany({
      where: { collegeId: null, collegeText: { equals: request.submittedText, mode: "insensitive" } },
      data: { collegeText: existingCollege?.name ?? finalText, collegeId: existingCollege?.id ?? null },
    });
    await prisma.listing.updateMany({
      where: { collegeId: null, collegeText: { equals: request.submittedText, mode: "insensitive" } },
      data: { collegeText: existingCollege?.name ?? finalText, collegeId: existingCollege?.id ?? null },
    });
  } else if (request.listType === "branch") {
    await prisma.user.updateMany({
      where: { branchId: null, branchText: { equals: request.submittedText, mode: "insensitive" } },
      data: { branchText: existingBranch?.name ?? finalText, branchId: existingBranch?.id ?? null },
    });
  } else {
    await prisma.listing.updateMany({
      where: { courseId: null, courseText: { equals: request.submittedText, mode: "insensitive" } },
      data: { courseText: existingCourse?.name ?? finalText, courseId: existingCourse?.id ?? null },
    });
  }

  if (request.submittedByUserId) {
    await prisma.notification.create({
      data: {
        userId: request.submittedByUserId,
        type: "entry_corrected",
        title: "An entry was corrected",
        body: `"${request.submittedText}" was corrected to "${finalText}".`,
        refId: request.id,
      },
    });
  }

  await prisma.masterListRequest.update({
    where: { id: requestId },
    data: {
      status: "modified_user_only",
      resolvedText: finalText,
      resolvedByAdminId: adminId,
      resolvedAt: new Date(),
    },
  });

  await writeAudit({
    adminUserId: adminId,
    action: "master_request_user_entry_modified",
    entity: request.listType,
    entityId: requestId,
    before: { submittedText: request.submittedText },
    after: { resolvedText: finalText },
  });
}
