import { test as setup } from "@playwright/test";
import { signInAdmin, ADMIN_STATE } from "./helpers";

/**
 * Signs in to the admin panel once and saves the session for the admin tests.
 *
 * Admin sign in is deliberately throttled to 10 attempts per 15 minutes, so a
 * suite that signed in on every test would lock itself out, which is exactly
 * what happened before this existed.
 */
setup("authenticate as the owner", async ({ page }) => {
  await signInAdmin(page);
  await page.context().storageState({ path: ADMIN_STATE });
});
