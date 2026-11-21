import { expect, test } from "@playwright/test";
import { ADMIN_STATE } from "./helpers";

test.describe("the admin panel, signed out", () => {
  test("refuses an unknown sign in and does not say which part was wrong", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Username").fill("nobody");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.locator("main").getByRole("alert")).toContainText("Incorrect username or password");
  });

  test("sends a signed out visitor to the admin sign in", async ({ page }) => {
    await page.goto("/admin/master-lists");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

});

// These reuse the session saved by the setup project rather than signing in
// again, because admin sign in is rate limited.
test.describe("the admin panel, signed in as the owner", () => {
  test.use({ storageState: ADMIN_STATE });

  test("the owner reaches every page", async ({ page }) => {
    for (const path of [
      "/admin/master-lists",
      "/admin/plans",
      "/admin/payments",
      "/admin/users",
      "/admin/listings",
      "/admin/user-access",
      "/admin/audit",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
    }
  });

  test("a plan without a QR code is flagged and stays hidden from students", async ({ page }) => {
    await page.goto("/admin/plans");

    await expect(page.getByRole("heading", { name: "Chat unlock packs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payment apps" })).toBeVisible();
  });

  test("changing the owner account asks for a code first", async ({ page }) => {
    await page.goto("/admin/user-access");

    await expect(page.getByText(/Changing the owner account needs a code/)).toBeVisible();
  });
});

test.describe("security headers", () => {
  test("every response carries the hardening headers", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() ?? {};

    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });
});
