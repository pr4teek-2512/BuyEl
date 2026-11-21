/**
 * Pure text helpers. No server or browser dependencies, fully unit testable.
 */

/**
 * Canonical form used to decide whether two master list entries are the same.
 * Lowercases, trims, and collapses internal whitespace. PRD section 16.2:
 * an exact match ignoring capitalisation must not create a new entry.
 */
export function normalizeName(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Two letter avatar initials. "abhishek singh" -> "AS", "abhishek" -> "AB".
 */
export function initials(name: string, lastName?: string | null): string {
  const parts = `${name ?? ""} ${lastName ?? ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const single = parts[0];
    return (single.length >= 2 ? single.slice(0, 2) : single).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Fallback abbreviation for a college that has no admin curated abbreviation.
 * "Delhi Technological University" -> "DTU".
 */
export function deriveAbbreviation(collegeName: string): string {
  const skip = new Set(["of", "the", "and", "for", "in", "at", "de", "&"]);
  const words = collegeName
    .trim()
    .split(/[\s,.-]+/)
    .filter((w) => w.length > 0 && !skip.has(w.toLowerCase()));

  if (words.length === 0) return collegeName.slice(0, 3).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 6)
    .toUpperCase();
}

/** Indian mobile numbers, stored as E.164. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    return `+${digits}`;
  }
  if (digits.length === 13 && digits.startsWith("091")) return `+${digits.slice(1)}`;
  return null;
}

export function phoneWithoutCountryCode(e164: string): string {
  return e164.replace(/^\+91/, "");
}

export function maskPhone(e164: string): string {
  const local = phoneWithoutCountryCode(e164);
  if (local.length < 4) return "******";
  return `${local.slice(0, 2)}******${local.slice(-2)}`;
}

export function formatRupees(paiseOrRupees: number): string {
  return `₹${paiseOrRupees.toLocaleString("en-IN")}`;
}
