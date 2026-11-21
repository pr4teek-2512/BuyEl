import { expect, test } from "@playwright/test";
import { signIn, TEST_ACCOUNTS } from "./helpers";

test.describe("the public landing page", () => {
  test("a visitor can search without an account", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("College or university").fill("Delhi Technological University");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page.getByRole("heading", { name: /listings at/ })).toBeVisible();
    // Nothing on this page asks them to sign in before looking.
    await expect(page).toHaveURL(/college=/);
  });

  test("chatting from the public page asks a visitor to sign in", async ({ page }) => {
    await page.goto("/?college=Delhi+Technological+University");

    const first = page.getByRole("link", { name: "Sign in to chat" }).first();
    await expect(first).toBeVisible();
    await first.click();

    await expect(page).toHaveURL(/\/login/);
  });

  test("the public results match the Buy page exactly", async ({ page }) => {
    const college = "Delhi Technological University";

    await signIn(page, TEST_ACCOUNTS.one);

    await page.goto(`/buy?college=${encodeURIComponent(college)}`);
    const buyTitles = await page.locator("main ul li p").allInnerTexts();

    await page.goto(`/?college=${encodeURIComponent(college)}`);
    const publicTitles = await page.locator("main ul li p").allInnerTexts();

    // Same listings, same order. PRD section 14.
    expect(publicTitles).toEqual(buyTitles);
  });

  test("the page works at phone width with no sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
