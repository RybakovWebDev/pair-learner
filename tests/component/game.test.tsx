// @vitest-environment jsdom
//
// Learn screen limits: the minimum number of pairs, and which row counts are offered. In endless mode the board needs
// at least one spare pair (rows + 1) so there's always something to refill with.
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makePairs } from "./board";

const db = vi.hoisted(() => ({ pairs: [] as unknown[] }));

vi.mock("@/utils/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: async () => ({ data: table === "word-pairs" ? db.pairs : [], error: null }),
      }),
    }),
  },
}));
vi.mock("@/contexts/UserContext", () => ({
  useUserContext: () => ({ user: { id: "u" }, loading: false, setUser: () => {} }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

import Game from "@/components/Game";

const ALL = makePairs([
  ["Cat", "Gato"],
  ["Dog", "Perro"],
  ["House", "Casa"],
  ["Water", "Agua"],
  ["Book", "Libro"],
  ["Sun", "Sol"],
  ["Moon", "Luna"],
  ["Tree", "Árbol"],
]);

// Row-count buttons are plain buttons labelled 3–8 (board cells have aria-pressed).
const rowOptions = () =>
  [...document.querySelectorAll<HTMLButtonElement>("main button:not([aria-pressed]), button:not([aria-pressed])")]
    .map((b) => b.textContent?.trim() ?? "")
    .filter((t) => /^[3-8]$/.test(t))
    .map(Number);
const boardRows = () => document.querySelectorAll("button[aria-pressed]").length / 2;

async function renderGame(pairCount: number, saved: Record<string, unknown> = {}) {
  db.pairs = ALL.slice(0, pairCount);
  for (const [k, v] of Object.entries(saved)) localStorage.setItem(k, JSON.stringify(v));
  render(<Game />);
  await waitFor(() => expect(screen.getByText("Start")).toBeTruthy());
}

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe("Learn screen limits", () => {
  it("asks for at least 5 pairs and disables Start below that", async () => {
    await renderGame(4);
    await screen.findByText("You need to add at least 5 word pairs to play the game.");
    expect(screen.getByText("Start").closest("button")!.disabled).toBe(true);
  });

  it("offers row counts up to the number of pairs in normal mode", async () => {
    await renderGame(6);
    await waitFor(() => expect(boardRows()).toBe(5));
    expect(rowOptions()).toEqual([3, 4, 5, 6]);
  });

  it("offers row counts up to pairs - 1 in endless mode, leaving a spare pair for refills", async () => {
    await renderGame(6, { "pl-endless-mode": true });
    await waitFor(() => expect(boardRows()).toBe(5));
    expect(rowOptions()).toEqual([3, 4, 5]);
  });

  // KNOWN BUG (found 2026-10-06): a saved row count above what's allowed (e.g. after deleting pairs, or filtering by a
  // tag with fewer pairs) leaves the board stuck on "Not enough pairs available", even though the row options are
  // capped. The row count should drop to the highest allowed value. Flip to it() when fixed.
  it.fails("lowers a saved row count that's too high (normal mode)", async () => {
    await renderGame(6, { "pl-row-count": 8 });
    await waitFor(() => expect(boardRows()).toBe(6), { timeout: 2000 });
  });

  it.fails("lowers a saved row count that's too high (endless mode)", async () => {
    await renderGame(6, { "pl-endless-mode": true, "pl-row-count": 8 });
    await waitFor(() => expect(boardRows()).toBe(5), { timeout: 2000 });
  });

  it("offers all row counts when there are plenty of pairs", async () => {
    await renderGame(8, { "pl-row-count": 8 });
    await waitFor(() => expect(boardRows()).toBe(8));
    expect(rowOptions()).toEqual([3, 4, 5, 6, 7, 8]);
  });
});
