import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

// The word pairs the test account always has (seeded by global.setup.ts). Games are played with these.
export const FIXTURE_PAIRS: [string, string][] = [
  ["Cat", "Gato"],
  ["Dog", "Perro"],
  ["House", "Casa"],
  ["Water", "Agua"],
  ["Book", "Libro"],
  ["Sun", "Sol"],
  ["Moon", "Luna"],
  ["Tree", "Árbol"],
];

export const partnerOf = (word: string) => {
  const pair = FIXTURE_PAIRS.find(([a, b]) => a === word || b === word);
  if (!pair) throw new Error(`Not a fixture word: ${word}`);
  return pair[0] === word ? pair[1] : pair[0];
};

// Everything tests create starts with this prefix, so leftovers from a failed run are easy to clean up.
export const E2E_PREFIX = "e2e-";

export function credentials() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error("Set E2E_EMAIL and E2E_PASSWORD in .env.local");
  return { email, password };
}

// A Supabase client signed in as the test account, for seeding and checking data directly.
export async function testAccountClient(): Promise<{ supabase: SupabaseClient; userId: string }> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword(credentials());
  if (error || !data.user) throw new Error(`Test account login failed: ${error?.message}`);
  return { supabase, userId: data.user.id };
}

// Deletes anything a test created (pairs/tags starting with "e2e-"; imports capitalize it to "E2e-").
export async function cleanupE2EData(supabase: SupabaseClient) {
  await supabase.from("word-pairs").delete().ilike("word1", `${E2E_PREFIX}%`);
  await supabase.from("tags").delete().ilike("name", `${E2E_PREFIX}%`);
}

// Game board helpers. Word cells are the only buttons with aria-pressed; left column first, then right.
export const wordCells = (page: Page) => page.locator("main button[aria-pressed]");

export async function boardWords(page: Page) {
  const words = (await wordCells(page).allInnerTexts()).map((w) => w.trim());
  const half = words.length / 2;
  return { left: words.slice(0, half), right: words.slice(half) };
}

export const cell = (page: Page, word: string) =>
  wordCells(page).filter({ hasText: new RegExp(`^\\s*${word}\\s*$`) });

export async function isMatched(page: Page, word: string) {
  return ((await cell(page, word).getAttribute("aria-label")) || "").includes("matched");
}

export async function matchWords(page: Page, a: string, b: string, { pauseMs = 0 } = {}) {
  await cell(page, a).click();
  if (pauseMs) await page.waitForTimeout(pauseMs);
  await cell(page, b).click();
}

// Settings toggles hide the real checkbox behind a styled switch, so click the label like a user would.
export async function turnOn(page: Page, label: string) {
  const box = page.getByRole("checkbox", { name: label });
  if (!(await box.isChecked())) await page.locator("label", { hasText: label }).click();
  await expect(box).toBeChecked();
}

// Waits until the board stops changing (same words and match states 500ms apart). Endless-mode refills swap cells
// in place about a second after a match, so the cell count alone can't tell an old board from a new one.
export async function waitForBoardToSettle(page: Page) {
  const snapshot = () =>
    wordCells(page).evaluateAll((els) => els.map((e) => `${e.textContent?.trim()}:${e.getAttribute("aria-label")}`).join("|"));
  let previous = "";
  await expect
    .poll(async () => {
      const current = await snapshot();
      const settled = current === previous;
      previous = current;
      return settled;
    }, { intervals: [500], timeout: 10_000 })
    .toBe(true);
}

export async function expectBoardReady(page: Page, rows = 5) {
  await expect(wordCells(page)).toHaveCount(rows * 2);
}
