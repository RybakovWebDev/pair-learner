import { expect, test, type Page } from "@playwright/test";

import { cleanupE2EData, E2E_PREFIX, testAccountClient } from "./helpers";

// A pair row is the list item that contains an input showing the given word.
const pairRow = (page: Page, word: string) =>
  page.locator("main li").filter({ has: page.locator(`input[id^="word1-"][value="${word}"]`) });

async function openEditor(page: Page) {
  await page.goto("/edit");
  await expect(page.getByRole("heading", { name: "Word Editor" })).toBeVisible();
  await expect(page.locator('input[id^="word1-"]').first()).toBeVisible();
}

test.afterAll(async () => {
  const { supabase } = await testAccountClient();
  await cleanupE2EData(supabase);
});

test("adds, edits, tags, finds and deletes a word pair", async ({ page }) => {
  const word = `${E2E_PREFIX}${Date.now()}`;
  const tagName = `${E2E_PREFIX}${String(Date.now()).slice(-8)}`; // tag names are limited to 15 characters
  await openEditor(page);

  // Add
  await page.getByRole("button", { name: "Add word pair" }).click();
  await page.locator('input[id^="word1-temp-"]').fill(word);
  await page.locator('input[id^="word2-temp-"]').fill("uno");
  await page.locator('input[id^="word2-temp-"]').press("Enter");
  await expect(pairRow(page, word)).toHaveCount(1);
  await openEditor(page);
  await expect(pairRow(page, word)).toHaveCount(1);
  await expect(pairRow(page, word).locator('input[id^="word2-"]')).toHaveValue("uno");

  // Edit
  await pairRow(page, word).getByRole("button", { name: "Edit" }).click();
  await pairRow(page, word).locator('input[id^="word2-"]').fill("dos");
  await pairRow(page, word).getByRole("button", { name: "Confirm edit" }).click();
  await openEditor(page);
  await expect(pairRow(page, word).locator('input[id^="word2-"]')).toHaveValue("dos");

  // Create a tag
  await page.getByRole("tab", { name: "Tags" }).click();
  await page.getByRole("button", { name: "Add tag" }).click();
  await page.getByPlaceholder("Tag names must be unique").fill(tagName);
  await page.getByPlaceholder("Tag names must be unique").press("Enter");
  await expect(page.locator("main input").and(page.locator(`[value="${tagName}"]`))).toHaveCount(1);

  // Tag the pair
  await openEditor(page);
  const row = pairRow(page, word);
  await row.getByRole("button", { name: "Edit" }).click(); // editing also opens the pair's tag list
  await row.getByText(tagName).click();
  await expect(row.getByRole("checkbox", { name: tagName })).toBeChecked();
  await row.getByRole("button", { name: "Confirm edit" }).click();

  // Search finds the pair by its tag name
  await openEditor(page);
  await page.locator("#search-input").fill(tagName);
  await expect(page.locator('input[id^="word1-"]')).toHaveCount(1);
  await expect(pairRow(page, word)).toHaveCount(1);
  await page.locator("#search-input").fill("");
  await expect(page.locator('input[id^="word1-"]').nth(1)).toBeVisible();

  // Delete the pair
  await pairRow(page, word).getByRole("button", { name: "Delete" }).click();
  await pairRow(page, word).getByRole("button", { name: "Confirm delete" }).click();
  await expect(pairRow(page, word)).toHaveCount(0);
  await openEditor(page);
  await expect(pairRow(page, word)).toHaveCount(0);

  // Delete the tag
  await page.getByRole("tab", { name: "Tags" }).click();
  const tagRow = page.locator("main li").filter({ has: page.locator(`input[value="${tagName}"]`) });
  await tagRow.getByRole("button", { name: "Delete" }).click();
  await tagRow.getByRole("button", { name: "Confirm delete" }).click();
  await expect(tagRow).toHaveCount(0);
});

test("cancelling a new pair leaves nothing behind", async ({ page }) => {
  const word = `${E2E_PREFIX}cancel-${Date.now()}`;
  await openEditor(page);
  await page.getByRole("button", { name: "Add word pair" }).click();
  await page.locator('input[id^="word1-temp-"]').fill(word);
  await page.getByRole("button", { name: "Cancel edit" }).click();
  await expect(pairRow(page, word)).toHaveCount(0);
  await openEditor(page);
  await expect(pairRow(page, word)).toHaveCount(0);
});

test("imports word pairs from a CSV file", async ({ page }) => {
  await openEditor(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: "e2e-import.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`${E2E_PREFIX}import-a,uno\n${E2E_PREFIX}import-b,dos\n`),
  });
  await expect(page.getByText("Success! Imported 2 pairs.")).toBeVisible();
  // Imports capitalize the first letter.
  await expect(pairRow(page, "E2e-import-a")).toHaveCount(1);
  await openEditor(page);
  await expect(pairRow(page, "E2e-import-b")).toHaveCount(1);
});
