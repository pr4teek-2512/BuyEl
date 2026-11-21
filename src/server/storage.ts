import "server-only";
import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Image storage for QR codes, payment app logos and the explanatory images.
 * Uses the Supabase Storage REST API directly with the service role key, so
 * the key never leaves the server and no client library is shipped.
 */

export const BUCKET = "buyel-public";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MAX_BYTES = 5 * 1024 * 1024;

export class UploadError extends Error {}

function extensionFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  return "svg";
}

export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!env.supabase.url || !env.supabase.serviceRoleKey) {
    throw new UploadError("Image storage is not configured.");
  }
  if (!ALLOWED.has(file.type)) {
    throw new UploadError("Upload a PNG, JPG, WEBP or SVG image.");
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError("That image is larger than 5 MB.");
  }
  if (file.size === 0) {
    throw new UploadError("That file is empty.");
  }

  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "misc";
  const path = `${safeFolder}/${Date.now()}-${randomBytes(6).toString("hex")}.${extensionFor(file.type)}`;

  const response = await fetch(
    `${env.supabase.url}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.supabase.serviceRoleKey}`,
        apikey: env.supabase.serviceRoleKey,
        "Content-Type": file.type,
        "cache-control": "31536000",
      },
      body: Buffer.from(await file.arrayBuffer()),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    console.error("[storage] upload failed", response.status, detail.slice(0, 200));
    throw new UploadError("Could not upload that image.");
  }

  return `${env.supabase.url}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** Returns null when nothing was chosen, so a form can leave an image alone. */
export async function uploadOptionalImage(
  value: FormDataEntryValue | null,
  folder: string,
): Promise<string | null> {
  if (!value || typeof value === "string") return null;
  if (value.size === 0) return null;
  return uploadImage(value, folder);
}
