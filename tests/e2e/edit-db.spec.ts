import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import * as XLSX from "xlsx";

import { cleanupE2EData, E2E_PREFIX, testAccountClient } from "./helpers";

// Word Editor database tests: each one drives /edit like a user, then checks the rows Supabase actually holds.
// They pin today's behaviour so the Word Editor can be refactored safely. Known bugs are pinned as they are, with a
// `test.fail` twin describing the intended behaviour (it starts passing, and so fails, once the bug is fixed).

type PairRow = {
  id: string;
  created_at: string;
  user_id: string;
  word1: string;
  word2: string;
  tag_ids: string[] | null;
  category: string | null;
};
type TagRow = { id: string; created_at: string; user_id: string; name: string };

let supabase: SupabaseClient;
let userId: string;

// A short id per run keeps this run's words and tag names apart from anything else on the account.
const run = Date.now().toString(36).slice(-6);
let counter = 0;
const uid = (label: string) => `${E2E_PREFIX}${run}${label}${++counter}`;

test.beforeAll(async () => {
  ({ supabase, userId } = await testAccountClient());
});

test.afterEach(async () => {
  await cleanupE2EData(supabase);
});

// ---- Database helpers ----

async function seedPairs(rows: Partial<PairRow>[]): Promise<PairRow[]> {
  const { data, error } = await supabase
    .from("word-pairs")
    .insert(rows.map((r) => ({ word2: "uno", tag_ids: [], user_id: userId, ...r })))
    .select();
  if (error) throw error;
  return data;
}

async function seedTag(name: string): Promise<TagRow> {
  const { data, error } = await supabase.from("tags").insert({ name, user_id: userId }).select().single();
  if (error) throw error;
  return data;
}

async function pairById(id: string): Promise<PairRow | null> {
  const { data, error } = await supabase.from("word-pairs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function pairsWhere(column: "word1" | "word2", value: string): Promise<PairRow[]> {
  const { data, error } = await supabase.from("word-pairs").select("*").eq(column, value);
  if (error) throw error;
  return data;
}

async function tagsNamed(name: string, { ignoreCase = false } = {}): Promise<TagRow[]> {
  const query = supabase.from("tags").select("*");
  const { data, error } = await (ignoreCase ? query.ilike("name", name) : query.eq("name", name));
  if (error) throw error;
  return data;
}

async function countPairsLike(pattern: string) {
  const { count, error } = await supabase
    .from("word-pairs")
    .select("*", { count: "exact", head: true })
    .ilike("word1", pattern);
  if (error) throw error;
  return count;
}

// ---- Page helpers ----

async function openEditor(page: Page) {
  await page.goto("/edit");
  await expect(page.getByRole("heading", { name: "Word Editor" })).toBeVisible();
  await expect(page.locator('input[id^="word1-"]').first()).toBeVisible();
}

// Loaded pair rows use the DB id in their input ids (`word1-<id>`), so rows can be found by id even while editing.
const pairRow = (page: Page, id: string) => page.locator("main li").filter({ has: page.locator(`[id="word1-${id}"]`) });
const word1Inputs = (page: Page) => page.locator('main input[id^="word1-"]');
const shownPairIds = async (page: Page) =>
  (await word1Inputs(page).evaluateAll((els) => els.map((e) => e.id))).map((id) => id.replace(/^word1-/, ""));

async function openTags(page: Page) {
  await page.getByRole("tab", { name: "Tags" }).click();
  await expect(page.getByRole("button", { name: "Add tag" })).toBeEnabled();
}
const tagRow = (page: Page, name: string) =>
  page.locator("main li").filter({ has: page.locator(`input[value="${name}"]`) });
// Only the tag being edited has an enabled input.
const editingTagInput = (page: Page) => page.locator('main li input[placeholder="Tag names must be unique"]:enabled');

// Search is debounced, so wait for its pairs request; until then the list still shows the unfiltered page.
async function search(page: Page, query: string) {
  const response = page.waitForResponse((r) => r.url().includes("/word-pairs?") && r.url().includes("or="));
  await page.locator("#search-input").fill(query);
  await response;
}

// Gives a write the app might wrongly make time to land before checking that nothing changed.
const settle = (page: Page) => page.waitForTimeout(1500);

// =====================================================================================================================

test.describe("pairs", () => {
  test("adding a pair writes one row with trimmed words, the user id and no tags", async ({ page }) => {
    const word = uid("add");
    await openEditor(page);
    await page.getByRole("button", { name: "Add word pair" }).click();
    await page.locator('input[id^="word1-temp-"]').fill(`${word}   `);
    await page.locator('input[id^="word2-temp-"]').fill("  uno  ");
    await page.locator('input[id^="word2-temp-"]').press("Enter");

    await expect.poll(() => pairsWhere("word1", word)).toHaveLength(1);
    const [row] = await pairsWhere("word1", word);
    expect(row).toMatchObject({ word1: word, word2: "uno", user_id: userId, tag_ids: [], category: null });
  });

  test("an empty word shows an error and writes nothing", async ({ page }) => {
    const [pair] = await seedPairs([{ word1: uid("empty"), word2: "uno" }]);
    await openEditor(page);
    const row = pairRow(page, pair.id);
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await row.locator('input[id^="word2-"]').fill("   ");
    await row.getByRole("button", { name: "Confirm edit" }).click();

    await expect(row.getByText("Word 2 cannot be empty")).toBeVisible();
    await settle(page);
    expect(await pairById(pair.id)).toEqual(pair);
  });

  test("editing both words updates only those columns", async ({ page }) => {
    const [pair] = await seedPairs([{ word1: uid("edit"), word2: "uno" }]);
    await openEditor(page);
    const row = pairRow(page, pair.id);
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await row.locator('input[id^="word1-"]').fill(`${pair.word1}x`);
    await row.locator('input[id^="word2-"]').fill("dos");
    await row.getByRole("button", { name: "Confirm edit" }).click();

    await expect.poll(async () => (await pairById(pair.id))?.word2).toBe("dos");
    expect(await pairById(pair.id)).toEqual({ ...pair, word1: `${pair.word1}x`, word2: "dos" });
  });

  test("cancelling an edit (button or Escape) leaves the row unchanged", async ({ page }) => {
    const [pair] = await seedPairs([{ word1: uid("cancel"), word2: "uno" }]);
    await openEditor(page);
    const row = pairRow(page, pair.id);

    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await row.locator('input[id^="word2-"]').fill("changed");
    await row.getByRole("button", { name: "Cancel edit" }).click();
    await expect(row.locator('input[id^="word2-"]')).toHaveValue("uno");

    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await row.locator('input[id^="word2-"]').fill("changed");
    await row.locator('input[id^="word2-"]').press("Escape");
    await expect(row.locator('input[id^="word2-"]')).toHaveValue("uno");

    await settle(page);
    expect(await pairById(pair.id)).toEqual(pair);
  });

  test("deleting a pair removes its row", async ({ page }) => {
    const [pair, other] = await seedPairs([{ word1: uid("del") }, { word1: uid("keep") }]);
    await openEditor(page);
    const row = pairRow(page, pair.id);
    await row.getByRole("button", { name: "Delete", exact: true }).click();
    await row.getByRole("button", { name: "Confirm delete" }).click();

    await expect.poll(() => pairById(pair.id)).toBeNull();
    expect(await pairById(other.id)).toEqual(other);
  });

  test("bulk delete removes exactly the selected rows, and cancelling the dialog removes none", async ({ page }) => {
    const [a, b, c] = await seedPairs([{ word1: uid("bulk") }, { word1: uid("bulk") }, { word1: uid("bulk") }]);
    await openEditor(page);
    await page.getByRole("button", { name: "Select multiple" }).click();
    await pairRow(page, a.id).getByRole("button", { name: "Select", exact: true }).click();
    await pairRow(page, b.id).getByRole("button", { name: "Select", exact: true }).click();

    await page.getByRole("button", { name: "Delete (2)" }).click();
    await expect(page.getByRole("heading", { name: "Delete 2 word pairs?" })).toBeVisible();
    await page.locator("button", { hasText: /^Cancel$/ }).click();
    await settle(page);
    expect(await pairById(a.id)).not.toBeNull();
    expect(await pairById(b.id)).not.toBeNull();

    await page.getByRole("button", { name: "Delete (2)" }).click();
    await page.locator("button", { hasText: /^Delete$/ }).click();
    await expect.poll(async () => [await pairById(a.id), await pairById(b.id)]).toEqual([null, null]);
    expect(await pairById(c.id)).toEqual(c);
  });
});

test.describe("35-character word limit", () => {
  test("the inputs stop at 35 characters, so typing 36 saves 35", async ({ page }) => {
    const [pair] = await seedPairs([{ word1: uid("long"), word2: "uno" }]);
    await openEditor(page);
    const row = pairRow(page, pair.id);
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    const input = row.locator('input[id^="word2-"]');
    await input.fill("");
    await input.pressSequentially("a".repeat(36));
    await expect(input).toHaveValue("a".repeat(35));
    await row.getByRole("button", { name: "Confirm edit" }).click();

    await expect.poll(async () => (await pairById(pair.id))?.word2).toBe("a".repeat(35));
  });

  test("the database rejects a 36-character word", async () => {
    const word1 = uid("db36").padEnd(36, "x");
    const { error } = await supabase.from("word-pairs").insert({ word1, word2: "uno", user_id: userId, tag_ids: [] });
    expect(error?.code).toBe("23514"); // check_violation
    expect(error?.message).toContain("word1_length_check");
    expect(await pairsWhere("word1", word1)).toHaveLength(0);
  });
});

test.describe("tags", () => {
  test("creating a tag writes a row with the name and user id", async ({ page }) => {
    const name = uid("t");
    await openEditor(page);
    await openTags(page);
    await page.getByRole("button", { name: "Add tag" }).click();
    await editingTagInput(page).fill(name);
    await editingTagInput(page).press("Enter");

    await expect.poll(() => tagsNamed(name)).toHaveLength(1);
    expect((await tagsNamed(name))[0]).toMatchObject({ name, user_id: userId });
  });

  test("renaming a tag updates the same row", async ({ page }) => {
    const tag = await seedTag(uid("t"));
    await openEditor(page);
    await openTags(page);
    await tagRow(page, tag.name).getByRole("button", { name: "Edit", exact: true }).click();
    await editingTagInput(page).fill(`${tag.name}r`);
    await editingTagInput(page).press("Enter");

    await expect.poll(() => tagsNamed(`${tag.name}r`)).toEqual([{ ...tag, name: `${tag.name}r` }]);
  });

  test("a duplicate name (any letter case) shows an error and writes nothing", async ({ page }) => {
    const tag = await seedTag(uid("t"));
    await openEditor(page);
    await openTags(page);
    await page.getByRole("button", { name: "Add tag" }).click();
    await editingTagInput(page).fill(tag.name.toUpperCase());
    await editingTagInput(page).press("Enter");

    await expect(page.getByText("A tag with this name already exists.")).toBeVisible();
    await settle(page);
    expect(await tagsNamed(tag.name, { ignoreCase: true })).toEqual([tag]);
  });

  test("an empty name shows an error and writes nothing", async ({ page }) => {
    const { count: before } = await supabase.from("tags").select("*", { count: "exact", head: true });
    await openEditor(page);
    await openTags(page);
    await page.getByRole("button", { name: "Add tag" }).click();
    await editingTagInput(page).fill("   ");
    await editingTagInput(page).press("Enter");

    await expect(page.getByText("Tag name cannot be empty.")).toBeVisible();
    await settle(page);
    const { count: after } = await supabase.from("tags").select("*", { count: "exact", head: true });
    expect(after).toBe(before);
  });

  test("the name input stops at 15 characters", async ({ page }) => {
    const name = uid("t").padEnd(15, "x");
    await openEditor(page);
    await openTags(page);
    await page.getByRole("button", { name: "Add tag" }).click();
    await editingTagInput(page).pressSequentially(`${name}y`);
    await expect(editingTagInput(page)).toHaveValue(name);
    await editingTagInput(page).press("Enter");

    await expect.poll(() => tagsNamed(name)).toHaveLength(1);
  });

  test("names are saved untrimmed (current behaviour)", async ({ page }) => {
    const name = `${uid("t")}  `;
    await openEditor(page);
    await openTags(page);
    await page.getByRole("button", { name: "Add tag" }).click();
    await editingTagInput(page).fill(name);
    await editingTagInput(page).press("Enter");

    await expect.poll(() => tagsNamed(name)).toHaveLength(1);
  });

  test("assigning and unassigning a tag updates the pair's tag_ids", async ({ page }) => {
    const tag = await seedTag(uid("t"));
    const [pair] = await seedPairs([{ word1: uid("tagged") }]);
    await openEditor(page);
    const row = pairRow(page, pair.id);

    await row.getByRole("button", { name: "Edit", exact: true }).click(); // editing also opens the pair's tag list
    await row.getByText(tag.name).click();
    await row.getByRole("button", { name: "Confirm edit" }).click();
    await expect.poll(async () => (await pairById(pair.id))?.tag_ids).toEqual([tag.id]);

    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(row.getByRole("checkbox", { name: tag.name })).toBeChecked();
    await row.getByText(tag.name).click();
    await row.getByRole("button", { name: "Confirm edit" }).click();
    await expect.poll(async () => (await pairById(pair.id))?.tag_ids).toEqual([]);
  });
});

test.describe("deleting a tag", () => {
  // One tagged pair is new (on the first page), one is old (beyond the 30 loaded pairs), with 30 untagged pairs between.
  async function deleteTagUsedByPairs(page: Page) {
    const tag = await seedTag(uid("t"));
    const [oldPair] = await seedPairs([{ word1: uid("old"), tag_ids: [tag.id], created_at: "2001-01-01T00:00:00Z" }]);
    await seedPairs(Array.from({ length: 30 }, () => ({ word1: uid("fill") })));
    const [newPair] = await seedPairs([{ word1: uid("new"), tag_ids: [tag.id] }]);

    const consoleErrors: string[] = [];
    page.on("console", (msg) => msg.type() === "error" && consoleErrors.push(msg.text()));

    await openEditor(page);
    await expect(pairRow(page, newPair.id)).toHaveCount(1);
    await expect(pairRow(page, oldPair.id)).toHaveCount(0);
    await openTags(page);
    await tagRow(page, tag.name).getByRole("button", { name: "Delete", exact: true }).click();
    await tagRow(page, tag.name).getByRole("button", { name: "Confirm delete" }).click();

    await expect.poll(() => tagsNamed(tag.name)).toHaveLength(0);
    await settle(page);
    return { tag, oldPair, newPair, consoleErrors };
  }

  test("removes the tag row but leaves its id on every pair (current behaviour, bug)", async ({ page }) => {
    const { tag, oldPair, newPair, consoleErrors } = await deleteTagUsedByPairs(page);

    // The follow-up upsert of the loaded pairs fails, and the error only goes to the console.
    expect(consoleErrors.join("\n")).toContain("Error updating pairs after tag deletion");
    expect((await pairById(newPair.id))?.tag_ids).toEqual([tag.id]);
    expect((await pairById(oldPair.id))?.tag_ids).toEqual([tag.id]);
  });

  test.fail("removes the tag's id from every pair, loaded or not (intended)", async ({ page }) => {
    const { oldPair, newPair } = await deleteTagUsedByPairs(page);
    expect((await pairById(newPair.id))?.tag_ids).toEqual([]);
    expect((await pairById(oldPair.id))?.tag_ids).toEqual([]);
  });
});

test.describe("paging", () => {
  async function loadAllPages(page: Page) {
    const loadMore = page.getByRole("button", { name: "Load more pairs" });
    for (let pageCount = 1; await loadMore.isVisible(); pageCount++) {
      await expect(word1Inputs(page)).toHaveCount(pageCount * 30);
      await loadMore.click();
      await expect(word1Inputs(page)).not.toHaveCount(pageCount * 30);
    }
  }

  async function allPairsNewestFirst() {
    const { data, error } = await supabase.from("word-pairs").select("id, created_at");
    if (error) throw error;
    return data;
  }

  async function expectEveryPairOnceNewestFirst(page: Page) {
    const shown = await shownPairIds(page);
    const all = await allPairsNewestFirst();
    expect(new Set(shown).size, "no pair shown twice").toBe(shown.length);
    expect([...shown].sort(), "every pair shown").toEqual(all.map((p) => p.id).sort());
    const createdAt = new Map(all.map((p) => [p.id, Date.parse(p.created_at)]));
    const times = shown.map((id) => createdAt.get(id)!);
    expect(times, "newest first").toEqual([...times].sort((x, y) => y - x));
  }

  test("shows 30 pairs, then 30 more per click, newest first, with no duplicates or gaps", async ({ page }) => {
    const now = Date.now();
    const seeded = await seedPairs(
      Array.from({ length: 35 }, (_, i) => ({
        word1: uid("pg"),
        created_at: new Date(now - i * 1000).toISOString(),
      })),
    );
    await openEditor(page);
    await expect(word1Inputs(page)).toHaveCount(30);
    expect(await shownPairIds(page)).toEqual(seeded.slice(0, 30).map((p) => p.id));

    await loadAllPages(page);
    await expectEveryPairOnceNewestFirst(page);
  });

  // An import inserts all its pairs in one statement, so they share one created_at. Paging orders by created_at only,
  // and Postgres doesn't keep ties in the same order between the `range` queries, so pages overlap and skip pairs
  // (bug, found 2026-11-10: 73 rows shown, 64 distinct). Remove `.fail` once the order has a tie-breaker.
  test.fail("pairs that share a created_at (like one import) page without duplicates or gaps (intended)", async ({
    page,
  }) => {
    await seedPairs(Array.from({ length: 65 }, () => ({ word1: uid("same") })));
    await openEditor(page);
    await loadAllPages(page);
    await expectEveryPairOnceNewestFirst(page);
  });
});

test.describe("search", () => {
  test("finds pairs by part of either word, ignoring case", async ({ page }) => {
    const [apple, other] = await seedPairs([
      { word1: uid("apple"), word2: `manzana${run}` },
      { word1: uid("pear"), word2: "pera" },
    ]);
    await openEditor(page);

    await search(page, `${run}APP`);
    await expect(word1Inputs(page)).toHaveCount(1);
    expect(await shownPairIds(page)).toEqual([apple.id]);

    await search(page, `ZANA${run}`);
    await expect(pairRow(page, apple.id)).toHaveCount(1);
    await expect(word1Inputs(page)).toHaveCount(1);

    await search(page, `${run}pear`);
    await expect(pairRow(page, other.id)).toHaveCount(1);
    await expect(word1Inputs(page)).toHaveCount(1);
  });

  test("finds pairs by tag name", async ({ page }) => {
    const tag = await seedTag(uid("t"));
    const [tagged] = await seedPairs([{ word1: uid("x"), tag_ids: [tag.id] }, { word1: uid("y") }]);
    await openEditor(page);
    await search(page, tag.name.slice(E2E_PREFIX.length));
    await expect(pairRow(page, tagged.id)).toHaveCount(1);
    await expect(word1Inputs(page)).toHaveCount(1);
  });

  // The tag ids go into one `tag_ids.cs.{a,b}` filter, which means "has all of them".
  test("when the query matches two tags, only pairs with both tags are found (current behaviour, bug)", async ({
    page,
  }) => {
    const [tagA, tagB] = [await seedTag(`${E2E_PREFIX}${run}qa`), await seedTag(`${E2E_PREFIX}${run}qb`)];
    const [onlyA, both] = await seedPairs([
      { word1: uid("onlya"), tag_ids: [tagA.id] },
      { word1: uid("both"), tag_ids: [tagA.id, tagB.id] },
    ]);
    await openEditor(page);
    await search(page, `${run}q`);
    await expect(pairRow(page, both.id)).toHaveCount(1);
    await expect(pairRow(page, onlyA.id)).toHaveCount(0);
  });

  test.fail("when the query matches two tags, pairs with either tag are found (intended)", async ({ page }) => {
    const [tagA, tagB] = [await seedTag(`${E2E_PREFIX}${run}ra`), await seedTag(`${E2E_PREFIX}${run}rb`)];
    const [onlyA, onlyB] = await seedPairs([
      { word1: uid("onlya"), tag_ids: [tagA.id] },
      { word1: uid("onlyb"), tag_ids: [tagB.id] },
    ]);
    await openEditor(page);
    await search(page, `${run}r`);
    await expect(pairRow(page, onlyA.id)).toHaveCount(1, { timeout: 5000 });
    await expect(pairRow(page, onlyB.id)).toHaveCount(1, { timeout: 5000 });
  });

  test("no results shows a message, and clearing the search brings the first page back", async ({ page }) => {
    await openEditor(page);
    const firstPage = await shownPairIds(page);

    await search(page, `${run}nomatch`);
    await expect(page.getByText("No word pairs match your search.")).toBeVisible();
    await expect(word1Inputs(page)).toHaveCount(0);

    await page.locator("#search-input").fill("");
    await expect(word1Inputs(page)).toHaveCount(firstPage.length);
    expect(await shownPairIds(page)).toEqual(firstPage);
  });
});

test.describe("import", () => {
  async function importFile(page: Page, name: string, buffer: Buffer, mimeType = "text/csv") {
    await page.locator('input[type="file"]').setInputFiles({ name, mimeType, buffer });
  }

  test("a CSV import writes one row per line: first value per cell, capitalized, cut to 35 characters", async ({
    page,
  }) => {
    const a = uid("csva");
    const b = uid("csvb");
    const long = uid("csvlong").padEnd(40, "z");
    const csv = [`${a},uno`, `  ${b}  ,"dos, tres"`, `${long},cuatro`].join("\n");
    await openEditor(page);
    await importFile(page, "e2e-import.csv", Buffer.from(csv));
    await expect(page.getByText("Success! Imported 3 pairs.")).toBeVisible();

    const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
    expect(await pairsWhere("word1", cap(a))).toMatchObject([
      { word2: "Uno", user_id: userId, tag_ids: [], category: null },
    ]);
    expect(await pairsWhere("word1", cap(b))).toMatchObject([{ word2: "Dos" }]);
    expect(await pairsWhere("word1", cap(long).slice(0, 35))).toMatchObject([{ word2: "Cuatro" }]);
  });

  test("an XLSX import writes the rows", async ({ page }) => {
    const words = [uid("xa"), uid("xb")];
    const sheet = XLSX.utils.aoa_to_sheet(words.map((w, i) => [w, `palabra${i}`]));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
    const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;

    await openEditor(page);
    await importFile(page, "e2e-import.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await expect(page.getByText("Success! Imported 2 pairs.")).toBeVisible();
    expect(await countPairsLike(`${E2E_PREFIX}${run}x%`)).toBe(2);
  });

  test("more than 300 lines imports only the first 300", async ({ page }) => {
    const csv = Array.from({ length: 301 }, (_, i) => `${E2E_PREFIX}${run}max${i},uno`).join("\n");
    await openEditor(page);
    await importFile(page, "e2e-import.csv", Buffer.from(csv));
    await expect(page.getByText("Success! Imported 300 pairs.")).toBeVisible();
    expect(await countPairsLike(`${E2E_PREFIX}${run}max%`)).toBe(300);
    expect(await pairsWhere("word1", `E2e-${run}max300`)).toHaveLength(0);
  });

  test("a file with a third column is rejected and writes nothing", async ({ page }) => {
    const csv = `${E2E_PREFIX}${run}three1,uno\n${E2E_PREFIX}${run}three2,dos,extra\n`;
    await openEditor(page);
    await importFile(page, "e2e-import.csv", Buffer.from(csv));
    await expect(page.getByText("File contains more than 2 columns.", { exact: false })).toBeVisible();
    await settle(page);
    expect(await countPairsLike(`${E2E_PREFIX}${run}three%`)).toBe(0);
  });

  test("a file over 1 MB is rejected and writes nothing", async ({ page }) => {
    const line = `${E2E_PREFIX}${run}big,${"x".repeat(30)}\n`;
    const csv = line.repeat(Math.ceil((1024 * 1024 + 1) / line.length));
    await openEditor(page);
    await importFile(page, "e2e-import.csv", Buffer.from(csv));
    await expect(page.getByText("File is too large. Maximum size is 1MB.")).toBeVisible();
    await settle(page);
    expect(await countPairsLike(`${E2E_PREFIX}${run}big%`)).toBe(0);
  });
});

// Row-level security, checked without creating other users. If RLS were broken, the writes below would only touch
// this run's `e2e-` rows or ids that don't exist.
test.describe("row-level security", () => {
  const anonClient = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });

  test("a logged-out client sees no rows and can't insert", async () => {
    const anon = anonClient();
    for (const table of ["word-pairs", "tags"]) {
      const { data, error } = await anon.from(table).select("id").limit(5);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    }
    const word1 = uid("anon");
    const { error } = await anon.from("word-pairs").insert({ word1, word2: "uno", tag_ids: [] });
    expect(error?.code).toBe("42501");
    expect(await pairsWhere("word1", word1)).toHaveLength(0);
  });

  test("the test account sees only its own rows", async () => {
    for (const table of ["word-pairs", "tags"]) {
      const { data, error } = await supabase.from(table).select("user_id");
      expect(error).toBeNull();
      expect(new Set(data!.map((r) => r.user_id))).toEqual(new Set(data!.length ? [userId] : []));
    }
  });

  test("rows can't be created for, or handed over to, another user id", async () => {
    const otherUser = randomUUID();
    const word1 = uid("foreign");
    const insert = await supabase.from("word-pairs").insert({ word1, word2: "uno", tag_ids: [], user_id: otherUser });
    expect(insert.error?.code).toBe("42501");
    const tagInsert = await supabase.from("tags").insert({ name: uid("t"), user_id: otherUser });
    expect(tagInsert.error?.code).toBe("42501");

    const [pair] = await seedPairs([{ word1: uid("handover") }]);
    const pairUpdate = await supabase.from("word-pairs").update({ user_id: otherUser }).eq("id", pair.id);
    expect(pairUpdate.error?.code).toBe("42501");
    expect(await pairById(pair.id)).toEqual(pair);

    const tag = await seedTag(uid("t"));
    const tagUpdate = await supabase.from("tags").update({ user_id: otherUser }).eq("id", tag.id);
    expect(tagUpdate.error?.code).toBe("42501");
    expect(await tagsNamed(tag.name)).toEqual([tag]);
  });

  test("updating or deleting an id the account doesn't own changes nothing", async () => {
    const missing = randomUUID();
    for (const table of ["word-pairs", "tags"]) {
      const update = await supabase.from(table).update({ created_at: new Date().toISOString() }).eq("id", missing).select();
      expect(update.error).toBeNull();
      expect(update.data).toEqual([]);
      const del = await supabase.from(table).delete().eq("id", missing).select();
      expect(del.error).toBeNull();
      expect(del.data).toEqual([]);
    }
  });
});
