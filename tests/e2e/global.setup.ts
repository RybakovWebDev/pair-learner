import { expect, test as setup } from "@playwright/test";

import { cleanupE2EData, credentials, FIXTURE_PAIRS, testAccountClient } from "./helpers";

const authFile = "playwright/.auth/user.json";

setup("seed test account data", async () => {
  const { supabase, userId } = await testAccountClient();
  await cleanupE2EData(supabase);

  const { data: existing, error } = await supabase.from("word-pairs").select("word1, word2");
  if (error) throw error;
  const missing = FIXTURE_PAIRS.filter(([w1, w2]) => !existing.some((p) => p.word1 === w1 && p.word2 === w2));
  if (missing.length) {
    const { error: insertError } = await supabase
      .from("word-pairs")
      .insert(missing.map(([word1, word2]) => ({ word1, word2, user_id: userId, tag_ids: [] })));
    if (insertError) throw insertError;
  }
});

setup("log in through the UI", async ({ page }) => {
  const { email, password } = credentials();
  await page.goto("/");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.getByRole("textbox", { name: "E-Mail:" }).fill(email);
  await page.getByRole("textbox", { name: "Password:" }).fill(password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
