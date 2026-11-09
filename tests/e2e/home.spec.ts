import { expect, test, type Page } from "@playwright/test";

// The homepage demo board uses the same game board as /learn, with emoji pairs and its own endless toggle.
const DEMO_PAIRS: [string, string][] = [
  ["🔥", "💧"],
  ["😀", "😢"],
  ["🌞", "🌧️"],
  ["👍", "👎"],
  ["😈", "😇"],
  ["🔑", "🔒"],
  ["🍅", "🍏"],
  ["😼", "🐶"],
  ["🍔", "🍟"],
  ["💡", "🔌"],
];
const partner = (w: string) => {
  const p = DEMO_PAIRS.find(([a, b]) => a === w || b === w)!;
  return p[0] === w ? p[1] : p[0];
};

test.use({ storageState: { cookies: [], origins: [] } });

const cells = (page: Page) => page.locator("main button[aria-pressed]");
const cell = (page: Page, w: string) => cells(page).filter({ hasText: new RegExp(`^\\s*${w}\\s*$`, "u") });
const words = async (page: Page) => (await cells(page).allInnerTexts()).map((t) => t.trim());

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(cells(page)).toHaveCount(10);
  // The demo shows a placeholder board until the real one is dealt.
  await expect
    .poll(async () => {
      const w = await words(page);
      return w.length === 10 && w.every((x) => DEMO_PAIRS.flat().includes(x));
    })
    .toBe(true);
});

test("the demo board can be played", async ({ page }) => {
  const w = (await words(page))[0];
  await cell(page, w).click();
  await cell(page, partner(w)).click();
  await expect(cell(page, w)).toHaveAttribute("aria-label", /matched/);
});

test("the demo's endless mode replaces a matched pair after it fades out", async ({ page }) => {
  await page.locator("label", { hasText: "Endless mode" }).click();
  await expect(page.getByRole("checkbox", { name: "Endless mode" })).toBeChecked();
  await expect(cells(page)).toHaveCount(10);
  await page.waitForTimeout(500); // the re-dealt board fades in
  const w = (await words(page))[0];
  await cell(page, w).click();
  await cell(page, partner(w)).click();
  await expect(cell(page, w)).toHaveAttribute("aria-label", /matched/);
  await expect(cell(page, w)).toHaveCount(0);
  await expect(cells(page)).toHaveCount(10);
});
