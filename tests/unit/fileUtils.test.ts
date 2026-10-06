import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { handleFileImport, MAX_FILE_SIZE, MAX_PAIRS } from "@/utils/fileUtils";

const user = { id: "user-1" } as User;

type InsertedRow = { word1: string; word2: string; user_id: string; tag_ids: string[] };

// Minimal stand-in for supabase.from("word-pairs").insert(rows).select()
function fakeSupabase({ fail = false } = {}) {
  const calls: { table: string; rows: InsertedRow[] }[] = [];
  const client = {
    from: (table: string) => ({
      insert: (rows: InsertedRow[]) => {
        calls.push({ table, rows });
        return {
          select: async () =>
            fail
              ? { data: null, error: { message: "insert failed" } }
              : { data: rows.map((r, i) => ({ ...r, id: `id-${i}` })), error: null },
        };
      },
    }),
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const csv = (content: string, name = "words.csv") => new File([content], name);

function xlsxFile(rows: string[][], name = "words.xlsx") {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
  const data = XLSX.write(book, { type: "array", bookType: "xlsx" });
  return new File([data], name);
}

describe("handleFileImport", () => {
  it("returns a silent failure when no file is given", async () => {
    const { client, calls } = fakeSupabase();
    const result = await handleFileImport(undefined as unknown as File, user, client);
    expect(result).toEqual({ success: false });
    expect(calls).toHaveLength(0);
  });

  it("rejects unsupported file extensions", async () => {
    const { client, calls } = fakeSupabase();
    const result = await handleFileImport(csv("a,b", "words.txt"), user, client);
    expect(result).toEqual({ success: false, error: "Please select a CSV or Excel file" });
    expect(calls).toHaveLength(0);
  });

  it("accepts extensions case-insensitively", async () => {
    const { client } = fakeSupabase();
    const result = await handleFileImport(csv("cat,gato", "WORDS.CSV"), user, client);
    expect(result.success).toBe(true);
  });

  it("rejects files over 1MB", async () => {
    const { client, calls } = fakeSupabase();
    const big = new File([new Uint8Array(MAX_FILE_SIZE + 1)], "big.csv");
    const result = await handleFileImport(big, user, client);
    expect(result).toEqual({ success: false, error: "File is too large. Maximum size is 1MB." });
    expect(calls).toHaveLength(0);
  });

  it("imports CSV rows into word-pairs with the user id and no tags", async () => {
    const { client, calls } = fakeSupabase();
    const result = await handleFileImport(csv("cat,gato\ndog,perro"), user, client);

    expect(result).toMatchObject({ success: true, successMessage: "Success! Imported 2 pairs." });
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe("word-pairs");
    expect(calls[0].rows).toEqual([
      { word1: "Cat", word2: "Gato", user_id: "user-1", tag_ids: [] },
      { word1: "Dog", word2: "Perro", user_id: "user-1", tag_ids: [] },
    ]);
  });

  it("returns the inserted rows from Supabase", async () => {
    const { client } = fakeSupabase();
    const result = await handleFileImport(csv("cat,gato"), user, client);
    expect(result.success && result.insertedPairs).toEqual([
      { word1: "Cat", word2: "Gato", user_id: "user-1", tag_ids: [], id: "id-0" },
    ]);
  });

  it("trims whitespace and capitalizes only the first letter", async () => {
    const { client, calls } = fakeSupabase();
    await handleFileImport(csv("  hELLO  ,  wORLD \n"), user, client);
    expect(calls[0].rows[0]).toMatchObject({ word1: "HELLO", word2: "WORLD" });
  });

  it("keeps only the first comma-separated value inside a cell", async () => {
    const { client, calls } = fakeSupabase();
    await handleFileImport(csv('"cat, kitty","gato, minino"'), user, client);
    expect(calls[0].rows[0]).toMatchObject({ word1: "Cat", word2: "Gato" });
  });

  it("truncates words to 35 characters", async () => {
    const { client, calls } = fakeSupabase();
    const long = "a".repeat(50);
    await handleFileImport(csv(`${long},b`), user, client);
    expect(calls[0].rows[0].word1).toBe("A" + "a".repeat(34));
  });

  it("skips rows where either word is empty", async () => {
    const { client, calls } = fakeSupabase();
    const result = await handleFileImport(csv("cat,gato\n,perro\nhouse,\nsun,sol"), user, client);
    expect(result).toMatchObject({ success: true, successMessage: "Success! Imported 2 pairs." });
    expect(calls[0].rows.map((r) => r.word1)).toEqual(["Cat", "Sun"]);
  });

  it("fails when no row has two words", async () => {
    const { client, calls } = fakeSupabase();
    const result = await handleFileImport(csv("cat,\n,perro"), user, client);
    expect(result).toEqual({
      success: false,
      error: "No valid word pairs found in file. Make sure each row has exactly two words.",
    });
    expect(calls).toHaveLength(0);
  });

  it("rejects files where any row has more than two filled columns", async () => {
    const { client, calls } = fakeSupabase();
    const result = await handleFileImport(csv("cat,gato\ndog,perro,chien"), user, client);
    expect(result).toEqual({
      success: false,
      error: "File contains more than 2 columns. Please ensure your file has exactly two columns for word pairs.",
    });
    expect(calls).toHaveLength(0);
  });

  it(`imports at most ${MAX_PAIRS} pairs`, async () => {
    const { client, calls } = fakeSupabase();
    const rows = Array.from({ length: MAX_PAIRS + 50 }, (_, i) => `w${i},v${i}`).join("\n");
    const result = await handleFileImport(csv(rows), user, client);
    expect(calls[0].rows).toHaveLength(MAX_PAIRS);
    expect(result).toMatchObject({ successMessage: `Success! Imported ${MAX_PAIRS} pairs.` });
  });

  it("reports a failed insert", async () => {
    const { client } = fakeSupabase({ fail: true });
    const result = await handleFileImport(csv("cat,gato"), user, client);
    expect(result).toEqual({ success: false, error: "Failed to import pairs. Please try again." });
  });

  it("imports .xlsx files", async () => {
    const { client, calls } = fakeSupabase();
    const result = await handleFileImport(
      xlsxFile([
        ["cat", "gato"],
        ["dog", "perro"],
      ]),
      user,
      client,
    );
    expect(result).toMatchObject({ success: true, successMessage: "Success! Imported 2 pairs." });
    expect(calls[0].rows.map((r) => [r.word1, r.word2])).toEqual([
      ["Cat", "Gato"],
      ["Dog", "Perro"],
    ]);
  });
});
