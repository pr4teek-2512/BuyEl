import { expect, test } from "@playwright/test";
import { signIn, signOut, TEST_ACCOUNTS } from "./helpers";

test.describe("signing in", () => {
  test("a test account signs in with its fixed code and lands on Buy", async ({ page }) => {
    await signIn(page, TEST_ACCOUNTS.one);

    await expect(page.getByRole("heading", { name: "Buy", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /credits/ })).toBeVisible();
  });

  test("signing in again never asks for the profile a second time", async ({ page }) => {
    await signIn(page, TEST_ACCOUNTS.one);
    await signOut(page);
    await signIn(page, TEST_ACCOUNTS.one);

    await expect(page.getByText("Complete your profile")).toHaveCount(0);
    await expect(page).toHaveURL(/\/buy/);
  });

  test("a wrong code is refused", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Mobile number").fill(TEST_ACCOUNTS.one.phone);
    await page.getByRole("button", { name: "Send code" }).click();

    await page.getByLabel("6 digit code").fill("999999");
    await page.getByRole("button", { name: "Verify and continue" }).click();

    await expect(page.locator("main").getByRole("alert")).toContainText("Incorrect code");
  });

  test("a number that is not a mobile number is refused", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Mobile number").fill("12345");
    await page.getByRole("button", { name: "Send code" }).click();

    await expect(page.locator("main").getByRole("alert")).toContainText("valid");
  });

  test("the app redirects a signed out visitor to sign in", async ({ page }) => {
    await page.goto("/sell");
    await expect(page).toHaveURL(/\/login/);
  });
});
