import { expect, test } from "@playwright/test";

import {
  boardWords,
  cell,
  expectBoardReady,
  isMatched,
  matchWords,
  openLeftWords,
  partnerOf,
  turnOn,
  waitForBoardToSettle,
  wordCells,
} from "./helpers";

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

test("endless mode fades a lone matched pair out over 5s, then replaces it without shifting the layout", async ({ page }) => {
  await turnOn(page, "Endless mode");
  // Toggling re-deals the board; reload (the setting is saved) so we start from a settled board.
  await page.reload();
  await expectBoardReady(page);
  await page.getByRole("button", { name: "Start" }).click();
  const columnHeights = () =>
    page.locator("section ul").evaluateAll((uls) => uls.map((ul) => ul.getBoundingClientRect().height));
  const heights = await columnHeights();

  const [matched] = await openLeftWords(page);
  await matchWords(page, matched, partnerOf(matched));

  // The pair stays on the board as matched (and unclickable) while it fades out.
  await expect.poll(() => isMatched(page, matched)).toBe(true);
  await page.waitForTimeout(3000);
  expect(await isMatched(page, matched)).toBe(true);
  expect(await columnHeights()).toEqual(heights);

  // About 5s after its flash, a different pair takes its place.
  await expect(cell(page, matched)).toHaveCount(0);
  await expectBoardReady(page);
  expect(await columnHeights()).toEqual(heights);
  const after = await boardWords(page);
  for (const word of after.left) expect(after.right).toContain(partnerOf(word));
});

test("endless mode replaces all matched pairs together once half the board is matched", async ({ page }) => {
  await turnOn(page, "Endless mode");
  await page.reload();
  await expectBoardReady(page);
  await page.getByRole("button", { name: "Start" }).click();

  // Three of five rows: the third match triggers the replacement about a second later.
  const gone: string[] = [];
  for (let i = 0; i < 3; i++) {
    const [word] = await openLeftWords(page);
    gone.push(word);
    await matchWords(page, word, partnerOf(word));
    await expect.poll(() => isMatched(page, word)).toBe(true);
  }
  await expect
    .poll(async () => (await boardWords(page)).left.some((w) => gone.includes(w)), { timeout: 2000 })
    .toBe(false);
  await expectBoardReady(page);
});

test("endless mode with mixed columns keeps the board consistent across refills", async ({ page }) => {
  await turnOn(page, "Endless mode");
  await turnOn(page, "Mix columns");
  await page.reload();
  await expectBoardReady(page);
  await page.getByRole("button", { name: "Start" }).click();

  // Eight matches at a human pace: a few batch replacements of several pairs at once.
  for (let i = 0; i < 8; i++) {
    await expect.poll(async () => (await openLeftWords(page)).length).toBeGreaterThan(0);
    const [word] = await openLeftWords(page);
    await matchWords(page, word, partnerOf(word), { pauseMs: 300 });
    // The pair flashes green for 500ms before it counts as matched; wait for that before picking the next one.
    await expect.poll(async () => (await cell(page, word).count()) === 0 || (await isMatched(page, word))).toBe(true);
    await page.waitForTimeout(400);
  }
  await expect(page.getByText("Matches:").locator("..")).toContainText("8");

  // Once everything is replaced, the board is full and consistent.
  await expect.poll(async () => (await openLeftWords(page)).length, { timeout: 10_000 }).toBe(5);
  const { left, right } = await boardWords(page);
  expect(new Set([...left, ...right]).size).toBe(10);
  for (const word of left) expect(right).toContain(partnerOf(word));
});

for (const endless of [false, true]) {
  test(`picks the next pair while the previous one is still flashing (${endless ? "endless" : "normal"} mode)`, async ({ page }) => {
    if (endless) {
      await turnOn(page, "Endless mode");
      await page.reload();
      await expectBoardReady(page);
    }
    await page.getByRole("button", { name: "Start" }).click();
    const [a, b] = await openLeftWords(page);
    // No pauses: the second pick starts well inside the first pick's 500ms flash.
    await matchWords(page, a, partnerOf(a));
    await matchWords(page, b, partnerOf(b));
    await expect(page.getByText("Matches:").locator("..")).toContainText("2");
    await expect.poll(async () => (await isMatched(page, a)) && (await isMatched(page, b))).toBe(true);
  });
}

test("changing the row count resizes the board", async ({ page }) => {
  await page.getByRole("button", { name: "7", exact: true }).click();
  await expectBoardReady(page, 7);
  await page.getByRole("button", { name: "5", exact: true }).click();
  await expectBoardReady(page, 5);
});

// Regression test for the endless-mode freeze (fixed 2026-10-06): a slot used to wait for <AnimatePresence mode="wait">
// exit animations, which sometimes never finished, leaving the old cell on screen forever.
test("endless mode survives quick back-to-back matches", async ({ page }) => {
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
