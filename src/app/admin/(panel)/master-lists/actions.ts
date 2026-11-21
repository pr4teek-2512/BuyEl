"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEditor } from "@/server/auth/adminSession";
import {
  createBranch,
  createCollege,
  createCourse,
  deleteBranch,
  deleteCollege,
  deleteCourse,
  updateBranch,
  updateCollege,
  updateCourse,
} from "@/server/services/masterlistAdmin.service";
import {
  addRequestToMasterList,
  ignoreRequest,
  modifyUserEntryOnly,
} from "@/server/services/masterlist.service";
import type { FormState } from "./state";

const PAGE = "master_lists" as const;

function failure(error: unknown): FormState {
  if (error instanceof Error) {
    if (error.message === "ADMIN_FORBIDDEN") {
      return { error: "You do not have edit access to this page." };
    }
    if (error.message === "ADMIN_UNAUTHENTICATED") {
      return { error: "Your admin session expired. Sign in again." };
    }
    return { error: error.message };
  }
  return { error: "Something went wrong." };
}

function done(message: string): FormState {
  revalidatePath("/admin/master-lists");
  revalidatePath("/admin");
  return { success: message };
}

const levelSchema = z.enum(["UG", "PG"]);

// ---------------------------------------------------------------------------
// Master list entries
// ---------------------------------------------------------------------------

export async function saveEntryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);
    const list = String(formData.get("list") ?? "");
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const abbreviation = String(formData.get("abbreviation") ?? "").trim();
    const level = String(formData.get("level") ?? "UG");

    if (!name) return { error: "Enter a name." };

    if (list === "college") {
      if (id) await updateCollege(admin.id, id, { name, abbreviation });
      else await createCollege(admin.id, { name, abbreviation });
    } else if (list === "branch") {
      const parsedLevel = levelSchema.parse(level);
      if (id) await updateBranch(admin.id, id, { name, level: parsedLevel });
      else await createBranch(admin.id, { name, level: parsedLevel });
    } else if (list === "course") {
      if (id) await updateCourse(admin.id, id, { name });
      else await createCourse(admin.id, { name });
    } else {
      return { error: "Unknown list." };
    }

    return done(id ? "Saved." : "Added to the master list.");
  } catch (error) {
    return failure(error);
  }
}

export async function deleteEntryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);
    const list = String(formData.get("list") ?? "");
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Nothing to delete." };

    if (list === "college") await deleteCollege(admin.id, id);
    else if (list === "branch") await deleteBranch(admin.id, id);
    else if (list === "course") await deleteCourse(admin.id, id);
    else return { error: "Unknown list." };

    return done("Deleted. Students who typed it keep their own text.");
  } catch (error) {
    return failure(error);
  }
}

// ---------------------------------------------------------------------------
// The three request actions from PRD 16.3
// ---------------------------------------------------------------------------

export async function resolveRequestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireEditor(PAGE);
    const requestId = String(formData.get("requestId") ?? "");
    const intent = String(formData.get("intent") ?? "");
    const text = String(formData.get("text") ?? "").trim();
    const abbreviation = String(formData.get("abbreviation") ?? "").trim();
    const level = String(formData.get("level") ?? "UG");

    if (!requestId) return { error: "Request not found." };

    if (intent === "add") {
      if (!text) return { error: "Enter the name to add." };
      await addRequestToMasterList(requestId, admin.id, text, {
        abbreviation: abbreviation || undefined,
        level: levelSchema.parse(level),
      });
      return done("Added to the master list and linked to everyone who typed it.");
    }

    if (intent === "ignore") {
      await ignoreRequest(requestId, admin.id);
      return done("Request ignored. The student's entry is unchanged.");
    }

    if (intent === "modify") {
      if (!text) return { error: "Enter the corrected text." };
      await modifyUserEntryOnly(requestId, admin.id, text);
      return done("The student's entry was corrected. The master list is unchanged.");
    }

    return { error: "Unknown action." };
  } catch (error) {
    return failure(error);
  }
}
