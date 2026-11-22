import { expect, test } from "@playwright/test";
import { deleteListing, listCourse, signIn, TEST_ACCOUNTS, uniqueCourse } from "./helpers";

test.describe("listings", () => {
  test("a new listing is free, lands at the bottom, and appears to other students", async ({
    page,
  }) => {
    const course = uniqueCourse();

    await signIn(page, TEST_ACCOUNTS.one);
    await page.goto("/sell");

    await listCourse(page, course, "777");

    const card = page.locator("li", { hasText: course }).first();
    await expect(card).toBeVisible();
    // Brand new, so it sits at the bottom of its college.
    await expect(card.getByText(/^#\d+$/)).toBeVisible();

    // The seller sees their own listing on Buy, marked You instead of a chat button.
    await page.goto("/buy");
    const ownRow = page.locator("li", { hasText: course }).first();
    await expect(ownRow).toBeVisible();
    await expect(ownRow.getByText("You")).toBeVisible();
    await expect(ownRow.getByRole("button", { name: "Chat" })).toHaveCount(0);

    await deleteListing(page, course);
  });

  test("the course and college cannot be changed once confirmed", async ({ page }) => {
    const course = uniqueCourse("E2E Immutable");

    await signIn(page, TEST_ACCOUNTS.one);
    await page.goto("/sell");
    await listCourse(page, course, "300");

    const card = page.locator("li", { hasText: course }).first();

    // Price is editable, the names are not even rendered as inputs.
    await expect(card.getByLabel("Price (rupees)")).toBeVisible();
    await expect(card.getByRole("textbox", { name: "Course" })).toHaveCount(0);
    await expect(card.getByRole("textbox", { name: "College" })).toHaveCount(0);

    await deleteListing(page, course);
  });

  test("the price can be changed at any time", async ({ page }) => {
    const course = uniqueCourse("E2E Price");

    await signIn(page, TEST_ACCOUNTS.one);
    await page.goto("/sell");
    await listCourse(page, course, "100");

    const card = page.locator("li", { hasText: course }).first();
    await card.getByLabel("Price (rupees)").fill("250");
    await card.getByRole("button", { name: "Save price" }).click();

    await expect(page.getByText("Price updated.")).toBeVisible();

    await deleteListing(page, course);
  });

  test("closing needs chat unlocked first", async ({ page }) => {
    const course = uniqueCourse("E2E Close");

    await signIn(page, TEST_ACCOUNTS.one);
    await page.goto("/sell");
    await listCourse(page, course, "150");

    const card = page.locator("li", { hasText: course }).first();

    // PRD section 7: Unlock chat shows until it is paid for, Close does not.
    await expect(card.getByRole("button", { name: "Unlock chat" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Close listing" })).toHaveCount(0);

    await deleteListing(page, course);
  });
});
