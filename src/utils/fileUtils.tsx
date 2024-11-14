import { SupabaseClient, User } from "@supabase/supabase-js";

type ImportedPair = {
  word1: string;
  word2: string;
};

type ImportResult =
  | { success: true; successMessage: string; insertedPairs: Array<any> }
  | { success: false; error?: string };

export const MAX_FILE_SIZE = 1024 * 1024; // 1MB
export const MAX_PAIRS = 300;

export async function handleFileImport(file: File, user: User, supabase: SupabaseClient): Promise<ImportResult> {
  if (!file) {
    return { success: false };
  }

  const fileExtension = file.name.split(".").pop()?.toLowerCase();

  if (!fileExtension || !["csv", "xlsx", "xls"].includes(fileExtension)) {
    return {
      success: false,
      error: "Please select a CSV or Excel file",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: "File is too large. Maximum size is 1MB.",
    };
  }

  try {
    const XLSX = await import("xlsx");

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: "",
    }) as unknown[][];

    const hasExtraColumns = rows.some(
      (row) => row.filter((cell) => cell !== "" && cell !== null && cell !== undefined).length > 2
    );

    if (hasExtraColumns) {
      return {
        success: false,
        error: "File contains more than 2 columns. Please ensure your file has exactly two columns for word pairs.",
      };
    }

    const validPairs: ImportedPair[] = rows
      .filter(
        (row: unknown[]): row is [string, string, ...unknown[]] =>
          Array.isArray(row) &&
          row.length >= 2 &&
          typeof row[0] === "string" &&
          typeof row[1] === "string" &&
          Boolean(row[0].trim()) &&
          Boolean(row[1].trim())
      )
      .map((row) => {
        const word1 = row[0].trim().split(",")[0].trim().slice(0, 35);
        const processedWord1 = word1.charAt(0).toUpperCase() + word1.slice(1);

        const word2 = row[1].trim().split(",")[0].trim().slice(0, 35);
        const processedWord2 = word2.charAt(0).toUpperCase() + word2.slice(1);

        return {
          word1: processedWord1,
          word2: processedWord2,
        };
      })
      .slice(0, MAX_PAIRS);

    if (validPairs.length === 0) {
      return {
        success: false,
        error: "No valid word pairs found in file. Make sure each row has exactly two words.",
      };
    }

    const pairsToInsert = validPairs.map((pair) => ({
      ...pair,
      user_id: user.id,
      tag_ids: [],
    }));

    const { data: insertedPairs, error: insertError } = await supabase
      .from("word-pairs")
      .insert(pairsToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting pairs:", insertError);
      return {
        success: false,
        error: "Failed to import pairs. Please try again.",
      };
    }

    return {
      success: true,
      successMessage: `Success! Imported ${validPairs.length} pairs.`,
      insertedPairs,
    };
  } catch (error) {
    console.error("Error processing file:", error);
    return {
      success: false,
      error: "Error reading file. Please make sure it's a valid file format.",
    };
  }
}
