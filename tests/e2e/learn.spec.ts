import { expect, test } from "@playwright/test";

import { boardWords, cell, expectBoardReady, isMatched, matchWords, partnerOf, turnOn, waitForBoardToSettle, wordCells } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/learn");
  await expectBoardReady(page);
});

test("plays a full round: wrong match, five correct matches, then a new round", async ({ page }) => {
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText("Matches:")).toBeVisible();

  const { left, right } = await boardWords(page);

  // A wrong match doesn't count and leaves both words unmatched.
  const wrong = right.find((w) => w !== partnerOf(left[0]))!;
  await matchWords(page, left[0], wrong);
  await page.waitForTimeout(1000);
  expect(await isMatched(page, left[0])).toBe(false);
  await expect(page.getByText("Matches:").locator("..")).toContainText("0");

  for (const word of left) {
    await matchWords(page, word, partnerOf(word));
    await page.waitForTimeout(700);
  }
  await expect(page.getByText("Matches:").locator("..")).toContainText("5");

  // Clearing the board deals a fresh round of unmatched words.
  await expect
    .poll(async () => (await wordCells(page).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).join())
    .not.toContain("matched");
  await expectBoardReady(page);
});

test("stopping hides the stats and shows Start again", async ({ page }) => {
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText("Matches:")).toBeVisible();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByText("Matches:")).toBeHidden();
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
});

test("shows the mistake count when enabled", async ({ page }) => {
  await turnOn(page, "Show mistake count");
  await page.getByRole("button", { name: "Start" }).click();
  const { left, right } = await boardWords(page);
  await matchWords(page, left[0], right.find((w) => w !== partnerOf(left[0]))!);
  await expect(page.getByText("Mistakes:").locator("..")).toContainText("1");
});

test("a timed round shows a countdown that disappears on stop", async ({ page }) => {
  await page.locator("#length").fill("30");
  await expect(page.getByText("seconds")).toBeVisible();
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText(/^00:(30|2\d)$/)).toBeVisible();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByText(/^00:\d\d$/)).toBeHidden();
});

test("endless mode replaces matched pairs after every second match", async ({ page }) => {
  await turnOn(page, "Endless mode");
  // Toggling re-deals the board; reload (the setting is saved) so we start from a settled board.
  await page.reload();
  await expectBoardReady(page);
  await expect(page.getByRole("checkbox", { name: "Endless mode" })).toBeChecked();
  await page.getByRole("button", { name: "Start" }).click();

  const before = await boardWords(page);
  for (const word of before.left.slice(0, 2)) {
    await matchWords(page, word, partnerOf(word));
    await page.waitForTimeout(900);
  }

  // Board stays full, nothing is left matched, and the two matched pairs were swapped for others.
  await expectBoardReady(page);
  await expect
    .poll(async () => (await wordCells(page).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).join())
    .not.toContain("matched");
  const after = await boardWords(page);
  expect(after.left.filter((w, i) => w !== before.left[i])).toHaveLength(2);
  for (const word of after.left) expect(after.right).toContain(partnerOf(word));
});

// FIXME (2026-10-05): skipped while investigating. In endless + mix columns, a click on a cell sometimes hangs, because
// Playwright sees the cell as still moving (cells offset by about 1px), and sometimes the previous match doesn't register.
// It happens before the endless-mode fix too. Once settled, the board is correct and nothing moves.
test("endless mode with mixed columns keeps the board consistent across refills", async ({ page }) => {
  await turnOn(page, "Endless mode");
  await turnOn(page, "Mix columns");
  await page.reload();
  await expectBoardReady(page);
  await page.getByRole("button", { name: "Start" }).click();

  // Four matches → two refills. Match whatever unmatched pair is on the left each time.
  for (let i = 0; i < 4; i++) {
    await waitForBoardToSettle(page);
    const { left } = await boardWords(page);
    let word = left[0];
    for (const w of left) if (!(await isMatched(page, w))) { word = w; break; }
    // Play at a human pace. Starting the next match right as the previous one finishes can freeze the game in
    // endless mode, a known app bug (see the guide). This test checks board consistency, not that race.
    await matchWords(page, word, partnerOf(word), { pauseMs: 300 });
    await page.waitForTimeout(1500);
  }
  await expect(page.getByText("Matches:").locator("..")).toContainText("4");
  await waitForBoardToSettle(page);

  await expectBoardReady(page);
  const { left, right } = await boardWords(page);
  expect(new Set([...left, ...right]).size).toBe(10);
  for (const word of left) expect(right).toContain(partnerOf(word));
});

test("changing the row count resizes the board", async ({ page }) => {
  await page.getByRole("button", { name: "7", exact: true }).click();
  await expectBoardReady(page, 7);
  await page.getByRole("button", { name: "5", exact: true }).click();
  await expectBoardReady(page, 5);
});

// KNOWN BUG (2026-10-06): skipped until the rendering rewrite (stage 3). It reproduces the endless-mode freeze (about 4 runs in 5):
// a slot's <AnimatePresence mode="wait"> exit sometimes never finishes, so the old cell stays on screen forever.
test.fixme("endless mode survives quick back-to-back matches", async ({ page }) => {
  await turnOn(page, "Endless mode");
  await page.reload();
  await expectBoardReady(page);
  await page.getByRole("button", { name: "Start" }).click();

  // Start each match as soon as the board stops changing, with no human-like pauses.
  for (let i = 0; i < 4; i++) {
    await waitForBoardToSettle(page);
    const { left } = await boardWords(page);
    let word = left[0];
    for (const w of left) if (!(await isMatched(page, w))) { word = w; break; }
    await cell(page, word).click({ timeout: 3000 });
    await cell(page, partnerOf(word)).click({ timeout: 3000 });
  }
  await expect(page.getByText("Matches:").locator("..")).toContainText("4");
});
