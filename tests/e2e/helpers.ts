import { expect, type Page } from "@playwright/test";

/** The seeded development test accounts. Neither triggers an SMS. */
export const TEST_ACCOUNTS = {
  one: { phone: "0000000001", otp: "010010" },
  two: { phone: "0000000002", otp: "020020" },
} as const;

export const OWNER = { username: "prateekchauhan", password: "Prateek@2512" } as const;

/** Where the signed in admin session is cached between tests. */
export const ADMIN_STATE = ".playwright/admin-state.json";

export async function signIn(page: Page, account: { phone: string; otp: string }) {
  await page.goto("/login");

  await page.getByLabel("Mobile number").fill(account.phone);
  await page.getByRole("button", { name: "Send code" }).click();

  await expect(page.getByText("Enter the code")).toBeVisible();
  await page.getByLabel("6 digit code").fill(account.otp);
  await page.getByRole("button", { name: "Verify and continue" }).click();

  await page.waitForURL("**/buy");
}

export async function signOut(page: Page) {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login");
}

export async function signInAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Username").fill(OWNER.username);
  await page.getByLabel("Password").fill(OWNER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/admin");
}

/**
 * Lists a course through the popup and dismisses the share popup that follows,
 * leaving the page ready to work with the new card.
 */
export async function listCourse(page: Page, course: string, price: string) {
  await page.getByRole("button", { name: "List a course" }).click();
  await page.getByLabel("Course", { exact: true }).fill(course);
  await page.getByLabel("Price", { exact: true }).fill(price);
  await page.getByRole("button", { name: "Confirm listing" }).click();

  // The share popup is the confirmation that the listing was created.
  await expect(page.getByText("Listing created")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Listing created")).toHaveCount(0);
}

/** A course name nothing else will collide with. */
export function uniqueCourse(prefix = "E2E Course") {
  return `${prefix} ${Date.now().toString().slice(-8)}`;
}

/** Removes a listing the test created, so repeated runs stay clean. */
export async function deleteListing(page: Page, courseName: string) {
  await page.goto("/sell");

  const card = page.locator("li", { hasText: courseName }).first();
  if ((await card.count()) === 0) return;

  await card.getByRole("button", { name: "Delete" }).click();
  await card.getByRole("button", { name: "Yes, delete" }).click();

  // The card disappearing is the confirmation: its success message lives
  // inside the card that was just removed.
  await expect(page.locator("li", { hasText: courseName })).toHaveCount(0);
}
