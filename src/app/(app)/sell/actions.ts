"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, destroyUserSession } from "@/server/auth/session";
import {
  closeListing,
  createListing,
  deleteListing,
  reopenListing,
  updateListingPrice,
} from "@/server/services/listing.service";
import type { SellFormState } from "./state";

function failure(error: unknown): SellFormState {
  if (error instanceof Error) {
    if (error.message === "UNAUTHENTICATED") {
      return { error: "Your session expired. Sign in again." };
    }
    return { error: error.message };
  }
  return { error: "Something went wrong." };
}

function done(message: string): SellFormState {
  revalidatePath("/sell");
  revalidatePath("/buy");
  return { success: message };
}

const createSchema = z.object({
  course: z.string().trim().min(2, "Enter the course name."),
  college: z.string().trim().min(2, "Enter the college name."),
  price: z.number().int("Enter a whole rupee amount.").min(1, "Enter a price of at least 1 rupee."),
});

export async function createListingAction(
  _prev: SellFormState,
  formData: FormData,
): Promise<SellFormState> {
  try {
    const user = await requireUser();

    const parsed = createSchema.safeParse({
      course: String(formData.get("course") ?? ""),
      college: String(formData.get("college") ?? ""),
      price: Number(formData.get("price") ?? 0),
    });

    if (!parsed.success) return { error: parsed.error.issues[0].message };

    await createListing({
      sellerId: user.id,
      courseName: parsed.data.course,
      collegeName: parsed.data.college,
      price: parsed.data.price,
    });

    return done("Listing created. It is live at the bottom of the Available tab.");
  } catch (error) {
    return failure(error);
  }
}

export async function updatePriceAction(
  _prev: SellFormState,
  formData: FormData,
): Promise<SellFormState> {
  try {
    const user = await requireUser();
    const listingId = String(formData.get("listingId") ?? "");
    const price = Number(formData.get("price") ?? 0);

    await updateListingPrice(user.id, listingId, price);
    return done("Price updated.");
  } catch (error) {
    return failure(error);
  }
}

export async function listingActionHandler(
  _prev: SellFormState,
  formData: FormData,
): Promise<SellFormState> {
  try {
    const user = await requireUser();
    const listingId = String(formData.get("listingId") ?? "");
    const intent = String(formData.get("intent") ?? "");

    if (intent === "close") {
      await closeListing(user.id, listingId);
      return done("Listing closed. It now shows under Sold Out.");
    }

    if (intent === "reopen") {
      await reopenListing(user.id, listingId);
      return done("Listing is active again.");
    }

    if (intent === "delete") {
      await deleteListing(user.id, listingId);
      return done("Listing deleted.");
    }

    return { error: "Unknown action." };
  } catch (error) {
    return failure(error);
  }
}

export async function signOutAction() {
  await destroyUserSession();
  redirect("/login");
}
