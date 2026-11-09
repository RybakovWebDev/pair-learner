// @vitest-environment jsdom
//
// The Learn screen around the board: counters, the round timer, Start/Stop, Refresh, settings while a game runs, and
// the tag filter. Supabase, the user and the router are mocked; timers are faked once the data has loaded.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Pair, Tag } from "@/constants";
import { pairsFrom } from "../fixtures/pairs";

const db = vi.hoisted(() => ({ pairs: [] as unknown[], tags: [] as unknown[] }));

vi.mock("@/utils/supabase/client", async () => {
  const { mockQuery } = await import("./supabaseMock");
  return {
    supabase: { from: (table: string) => ({ select: () => mockQuery(table === "word-pairs" ? db.pairs : db.tags) }) },
  };
});
vi.mock("@/contexts/UserContext", () => ({
  useUserContext: () => ({ user: { id: "u" }, loading: false, setUser: () => {} }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

import Game from "@/components/Game";

const PAIRS = pairsFrom([
  ["Cat", "Gato"],
  ["Dog", "Perro"],
  ["House", "Casa"],
  ["Water", "Agua"],
  ["Book", "Libro"],
  ["Sun", "Sol"],
  ["Moon", "Luna"],
  ["Tree", "Árbol"],
]);

// --- helpers ---

const boardWords = () =>
  [...document.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")].map((b) => b.textContent!.trim());
const cell = (word: string) =>
  [...document.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")].find((b) => b.textContent!.trim() === word)!;
const partner = (pairs: Pair[], word: string) => {
  const p = pairs.find((x) => x.word1 === word || x.word2 === word)!;
  return p.word1 === word ? p.word2 : p.word1;
};
const leftWords = () => boardWords().slice(0, boardWords().length / 2);
/** Left words that can still be picked (matched words stay on the board in normal mode). */
const openLeftWords = () => leftWords().filter((w) => !cell(w).getAttribute("aria-label")!.includes("matched"));
const statValue = (label: string) => screen.getByText(label).parentElement!.textContent!.replace(label, "").trim();
const toggle = (label: string) => screen.getByRole("checkbox", { name: label }) as HTMLInputElement;
const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;

/** Steps fake time forward, letting React re-render and schedule its next timers in between. */
async function advance(ms: number, step = 50) {
  for (let left = ms; left > 0; left -= step) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(step, left));
    });
  }
}

async function matchOne(pairs: Pair[]) {
  const [w] = openLeftWords();
  fireEvent.click(cell(w));
  fireEvent.click(cell(partner(pairs, w)));
  await advance(600);
}

async function makeMistake(pairs: Pair[]) {
  const [w] = openLeftWords();
  const openRight = boardWords()
    .slice(leftWords().length)
    .filter((r) => !cell(r).getAttribute("aria-label")!.includes("matched"));
  const wrong = openRight.find((r) => r !== partner(pairs, w))!;
  fireEvent.click(cell(w));
  fireEvent.click(cell(wrong));
  await advance(800);
}

async function renderGame({ pairs = PAIRS as unknown[], tags = [] as Tag[], saved = {} as Record<string, unknown> } = {}) {
  db.pairs = pairs;
  db.tags = tags;
  for (const [k, v] of Object.entries(saved)) localStorage.setItem(k, JSON.stringify(v));
  render(<Game />);
  await waitFor(() => expect(screen.getByText("Start")).toBeTruthy());
  await waitFor(() => expect(boardWords().length).toBeGreaterThan(0));
  vi.useFakeTimers();
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// --- tests ---

describe("counters", () => {
  it("counts matches and mistakes during a game", async () => {
    await renderGame({ saved: { "pl-show-mistakes": true } });
    fireEvent.click(button("Start"));
    await matchOne(PAIRS);
    await matchOne(PAIRS);
    await makeMistake(PAIRS);
    expect(statValue("Matches:")).toBe("2");
    expect(statValue("Mistakes:")).toBe("1");
  });

  it("counts picks made during other picks' flashes exactly once each", async () => {
    await renderGame({ saved: { "pl-show-mistakes": true } });
    fireEvent.click(button("Start"));
    await advance(500);
    // Three correct picks and a wrong one, each started 50ms after the last, all flashing at once.
    const used: string[] = [];
    for (let i = 0; i < 3; i++) {
      const w = openLeftWords().find((x) => !used.includes(x))!; // words still flashing look open, so skip used ones
      used.push(w);
      fireEvent.click(cell(w));
      fireEvent.click(cell(partner(PAIRS, w)));
      await advance(50);
    }
    const w = openLeftWords().find((x) => !used.includes(x))!;
    const taken = [...used, w].map((x) => partner(PAIRS, x));
    const wrong = boardWords()
      .slice(leftWords().length)
      .find((r) => !taken.includes(r))!;
    fireEvent.click(cell(w));
    fireEvent.click(cell(wrong));
    await advance(1000);
    expect(statValue("Matches:")).toBe("3");
    expect(statValue("Mistakes:")).toBe("1");
    expect(document.querySelectorAll('button[aria-label*="matched"]')).toHaveLength(6);
  });

  it("starts the next game from zero after Stop", async () => {
    await renderGame({ saved: { "pl-show-mistakes": true } });
    fireEvent.click(button("Start"));
    await matchOne(PAIRS);
    await makeMistake(PAIRS);
    fireEvent.click(button("Stop"));
    await advance(1000);
    fireEvent.click(button("Start"));
    expect(statValue("Matches:")).toBe("0");
    expect(statValue("Mistakes:")).toBe("0");
  });

  // Regression test (fixed 2026-11-09): a timed round that ran out kept its counts, and the next game started from them.
  it("starts the next game from zero after a timed round runs out", async () => {
    await renderGame({ saved: { "pl-show-mistakes": true } });
    fireEvent.change(document.querySelector("input#length")!, { target: { value: "30" } });
    fireEvent.click(button("Start"));
    await matchOne(PAIRS);
    await makeMistake(PAIRS);
    expect(statValue("Matches:")).toBe("1");
    await advance(31_000, 250);
    expect(screen.queryByText("Matches:")).toBeNull();
    fireEvent.click(button("Start"));
    expect(statValue("Matches:")).toBe("0");
    expect(statValue("Mistakes:")).toBe("0");
  });
});

describe("timed rounds", () => {
  it("counts down and stops the game at zero, with a fresh board", async () => {
    await renderGame();
    fireEvent.change(document.querySelector("input#length")!, { target: { value: "30" } });
    fireEvent.click(button("Start"));
    await matchOne(PAIRS);
    expect(screen.getByText(/^00:\d\d$/)).toBeTruthy();
    await advance(29_000, 250);
    expect(screen.getByText("00:01")).toBeTruthy();
    await advance(2000, 250);
    expect(screen.getByText("Start")).toBeTruthy();
    expect(screen.queryByText(/^00:\d\d$/)).toBeNull();
    // The board was re-dealt: nothing is left matched.
    expect(document.querySelectorAll('button[aria-label*="matched"]')).toHaveLength(0);
  });

  it("has no countdown when the round length is Infinite", async () => {
    await renderGame();
    fireEvent.click(button("Start"));
    await advance(5000, 250);
    expect(screen.queryByText(/^\d\d:\d\d$/)).toBeNull();
    expect(screen.getByText("Stop")).toBeTruthy();
  });
});

describe("settings while a game runs", () => {
  const LABELS = ["Show sparkles", "Endless mode", "Mix columns", "Fast animations", "Show mistake count"];

  // Regression test (fixed 2026-11-09): toggles were only blocked for the mouse; Tab + Space still changed them.
  it("disables every settings toggle during a game, and enables them again after Stop", async () => {
    await renderGame();
    for (const label of LABELS) expect(toggle(label).disabled).toBe(false);
    fireEvent.click(button("Start"));
    await advance(500); // the button's label swaps with a short animation
    for (const label of LABELS) expect(toggle(label).disabled, label).toBe(true);
    fireEvent.click(button("Stop"));
    for (const label of LABELS) expect(toggle(label).disabled, label).toBe(false);
  });

  it("ignores the row count, round length and Refresh during a game", async () => {
    await renderGame();
    fireEvent.click(button("Start"));
    await matchOne(PAIRS);
    const words = boardWords().join();
    fireEvent.click(button("7"));
    fireEvent.click(button("Refresh list"));
    fireEvent.change(document.querySelector("input#length")!, { target: { value: "30" } });
    await advance(1000);
    expect(boardWords().join()).toBe(words);
    expect(leftWords()).toHaveLength(5);
    expect(screen.queryByText(/^00:\d\d$/)).toBeNull();
  });

  it("re-deals on Refresh when no game is running", async () => {
    await renderGame({ pairs: pairsFrom(Array.from({ length: 300 }, (_, i): [string, string] => [`w${i}`, `v${i}`])) });
    const words = boardWords().join();
    fireEvent.click(button("Refresh list"));
    await advance(1000);
    expect(boardWords().join()).not.toBe(words);
  });

  it("doesn't re-deal when fast animations are switched", async () => {
    await renderGame();
    const words = boardWords().join();
    fireEvent.click(toggle("Fast animations"));
    await advance(1000);
    expect(boardWords().join()).toBe(words);
  });
});

describe("tag filter", () => {
  const TAGS: Tag[] = [
    { id: "t-food", name: "Food", user_id: "u" } as Tag,
    { id: "t-few", name: "Few", user_id: "u" } as Tag,
  ];
  const FOOD = pairsFrom(
    [
      ["Bread", "Pan"],
      ["Milk", "Leche"],
      ["Apple", "Manzana"],
      ["Egg", "Huevo"],
      ["Rice", "Arroz"],
      ["Fish", "Pescado"],
    ],
    "f",
  ).map((p) => ({ ...p, tag_ids: ["t-food"] }));
  const FEW = pairsFrom([["Red", "Rojo"]], "r").map((p) => ({ ...p, tag_ids: ["t-few"] }));

  async function chooseTag(name: string) {
    fireEvent.click(screen.getByText("Filter by tags:"));
    await advance(100);
    fireEvent.click(screen.getByText(name));
    await advance(1000);
  }

  it("plays only the pairs with the chosen tag, and caps the rows at their number", async () => {
    await renderGame({ pairs: [...PAIRS, ...FOOD, ...FEW], tags: TAGS, saved: { "pl-row-count": 8 } });
    expect(leftWords()).toHaveLength(8);
    await chooseTag("Food");
    const foodWords = FOOD.flatMap((p) => [p.word1, p.word2]);
    expect(leftWords()).toHaveLength(6);
    for (const w of boardWords()) expect(foodWords).toContain(w);
  });

  it("asks for more pairs when the chosen tag has fewer than 5", async () => {
    await renderGame({ pairs: [...PAIRS, ...FEW], tags: TAGS });
    await chooseTag("Few");
    expect(screen.getByText("You need to add at least 5 word pairs to play the game.")).toBeTruthy();
    expect(button("Start").disabled).toBe(true);
  });

  // Regression test (fixed 2026-11-09): tag_ids can be null in the database, which crashed the tag filter.
  it("treats pairs without a tag list as untagged", async () => {
    const untagged = PAIRS.map((p) => ({ ...p, tag_ids: null }));
    await renderGame({ pairs: [...untagged, ...FOOD], tags: TAGS });
    await chooseTag("Food");
    const foodWords = FOOD.flatMap((p) => [p.word1, p.word2]);
    for (const w of boardWords()) expect(foodWords).toContain(w);
  });
});
