import { expect, test } from "@playwright/test";

import { cleanupE2EData, E2E_PREFIX, expectBoardReady, testAccountClient } from "./helpers";

// What the Learn screen loads from Supabase. The project's API returns at most 2,000 rows per request (checked
// 2026-11-10: 2,608 rows in, 2,000 out), so a player with more pairs than that must still get all of them.

test.afterEach(async () => {
  const { supabase } = await testAccountClient();
  await cleanupE2EData(supabase);
});

test("loads every pair, even past the API's 2,000-row limit", async ({ page }) => {
  test.setTimeout(120_000);
  const { supabase, userId } = await testAccountClient();
  const rows = Array.from({ length: 2005 }, (_, i) => ({ word1: `${E2E_PREFIX}big${i}`, word2: "x", user_id: userId, tag_ids: [] }));
  const { error } = await supabase.from("word-pairs").insert(rows);
  if (error) throw error;
  const { count } = await supabase.from("word-pairs").select("*", { count: "exact", head: true });
  expect(count).toBeGreaterThan(2000);

  // Collect the ids of every pair row the page receives.
  const received = new Set<string>();
  const pending: Promise<void>[] = [];
  page.on("response", (response) => {
    if (!response.url().includes("/rest/v1/word-pairs") || response.request().method() !== "GET") return;
    pending.push(
      response
        .json()
        .then((body) => {
          if (Array.isArray(body)) body.forEach((row: { id: string }) => received.add(row.id));
        })
        .catch(() => {}),
    );
  });

  await page.goto("/learn");
  await expectBoardReady(page);
  await Promise.all(pending);
  expect(received.size).toBe(count);
});
