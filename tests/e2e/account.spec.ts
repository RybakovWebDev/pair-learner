import { expect, test } from "@playwright/test";

import { credentials, FIXTURE_PAIRS, testAccountClient } from "./helpers";

test("shows the account email and can cancel editing", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Update account information" })).toBeVisible();
  await expect(page.locator("main input").first()).toHaveValue(credentials().email);

  await page.getByRole("button", { name: "Edit account information" }).click();
  await expect(page.getByRole("button", { name: "Cancel changes" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel changes" }).click();
  await expect(page.getByRole("button", { name: "Edit account information" })).toBeVisible();
});

test("cancelling 'delete all' keeps the data", async ({ page }) => {
  await page.goto("/account");
  await page.getByRole("button", { name: "Delete all word pairs" }).click();
  await expect(page.getByText("Delete all word pairs?")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Delete all word pairs?")).toBeHidden();

  const { supabase } = await testAccountClient();
  const { count } = await supabase.from("word-pairs").select("*", { count: "exact", head: true });
  expect(count).toBeGreaterThanOrEqual(FIXTURE_PAIRS.length);
});

test.describe("logged out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("protected pages redirect to the homepage", async ({ page }) => {
    for (const path of ["/learn", "/edit", "/account"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test("a wrong password shows an error", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.getByRole("textbox", { name: "E-Mail:" }).fill(credentials().email);
    await page.getByRole("textbox", { name: "Password:" }).fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
  });
});
