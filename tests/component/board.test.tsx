// @vitest-environment jsdom
//
// Behavior spec for the game board (PairList), tested from the outside: props in, what the player sees and clicks
// (cell text, aria-pressed, aria-label "matched"), and the onPairSolved/onPairMistake callbacks out.
// These tests must keep passing through the game rewrite. Tests marked it.fails / it.todo describe intended changes.
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  advance,
  cell,
  cells,
  click,
  clickPair,
  columns,
  isMatched,
  isSelected,
  makePairs,
  matchedCount,
  PAIRS,
  partnerIn,
  partnerOf,
  renderBoard,
  words,
} from "./board";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const expectValidBoard = (rows: number) => {
  const { left, right } = columns();
  expect(left).toHaveLength(rows);
  expect(right).toHaveLength(rows);
  expect(new Set(words()).size).toBe(rows * 2);
  for (const w of left) expect(right).toContain(partnerOf(w));
};

describe("dealing", () => {
  it("deals the requested number of pairs, one word per column, all unmatched", async () => {
    for (const rows of [3, 5, 7]) {
      await renderBoard({ numPairs: rows });
      expectValidBoard(rows);
      expect(matchedCount()).toBe(0);
      cleanup();
    }
  });

  it("puts word1 on the left when mix columns is off", async () => {
    await renderBoard();
    const word1s = PAIRS.map((p) => p.word1);
    for (const w of columns().left) expect(word1s).toContain(w);
  });

  it("can put word2 on the left when mix columns is on", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1); // coin flip < 0.5 swaps every pair
    await renderBoard({ mixColumns: true });
    const word2s = PAIRS.map((p) => p.word2);
    for (const w of columns().left) expect(word2s).toContain(w);
  });

  it("shows a message instead of a board when there are fewer pairs than rows", async () => {
    await renderBoard({ pairs: PAIRS.slice(0, 3), numPairs: 5 });
    expect(cells()).toHaveLength(0);
    screen.getByText(/Not enough pairs available/);
  });
});

describe("selecting", () => {
  it("selects a word on click and deselects it on a second click", async () => {
    await renderBoard();
    const [w] = columns().left;
    click(w);
    expect(isSelected(w)).toBe(true);
    click(w);
    expect(isSelected(w)).toBe(false);
  });

  it("moves the selection when another word in the same column is clicked", async () => {
    await renderBoard();
    const [a, b] = columns().left;
    click(a);
    click(b);
    expect(isSelected(a)).toBe(false);
    expect(isSelected(b)).toBe(true);
  });

  it("works from either column first", async () => {
    const { onPairSolved } = await renderBoard();
    const r = columns().right[0];
    clickPair(r, partnerOf(r));
    await advance(500);
    expect(onPairSolved).toHaveBeenCalledTimes(1);
  });

  it("ignores clicks while the game isn't running", async () => {
    await renderBoard({ isGameRunning: false });
    const [w] = columns().left;
    click(w);
    expect(isSelected(w)).toBe(false);
  });

  it("ignores clicks on matched words", async () => {
    await renderBoard();
    const [w] = columns().left;
    clickPair(w, partnerOf(w));
    await advance(500);
    click(w);
    expect(isSelected(w)).toBe(false);
  });
});

describe("matching", () => {
  it("marks a correct pair as matched after 500ms and reports it", async () => {
    const { onPairSolved, onPairMistake } = await renderBoard();
    const [w] = columns().left;
    clickPair(w, partnerOf(w));
    expect(onPairSolved).toHaveBeenCalledTimes(1);
    await advance(499);
    expect(isMatched(w)).toBe(false);
    await advance(1);
    expect(isMatched(w)).toBe(true);
    expect(isMatched(partnerOf(w))).toBe(true);
    expect(onPairMistake).not.toHaveBeenCalled();
  });

  it("takes 250ms with fast animations", async () => {
    await renderBoard({ fastAnimations: true });
    const [w] = columns().left;
    clickPair(w, partnerOf(w));
    await advance(249);
    expect(isMatched(w)).toBe(false);
    await advance(1);
    expect(isMatched(w)).toBe(true);
  });

  it("reports a wrong pair, then releases both words after 700ms", async () => {
    const { onPairSolved, onPairMistake } = await renderBoard();
    const { left, right } = columns();
    const wrong = right.find((r) => r !== partnerOf(left[0]))!;
    clickPair(left[0], wrong);
    expect(onPairMistake).toHaveBeenCalledTimes(1);
    expect(onPairSolved).not.toHaveBeenCalled();

    // Still locked just before 700ms...
    await advance(699);
    click(left[1]);
    expect(isSelected(left[1])).toBe(false);
    // ...and playable right after, with nothing matched or selected.
    await advance(1);
    expect(isMatched(left[0])).toBe(false);
    expect(isMatched(wrong)).toBe(false);
    expect(isSelected(left[0])).toBe(false);
    click(left[1]);
    expect(isSelected(left[1])).toBe(true);
  });

  it("releases a wrong pair after 400ms with fast animations", async () => {
    await renderBoard({ fastAnimations: true });
    const { left, right } = columns();
    clickPair(left[0], right.find((r) => r !== partnerOf(left[0]))!);
    await advance(399);
    click(left[1]);
    expect(isSelected(left[1])).toBe(false);
    await advance(1);
    click(left[1]);
    expect(isSelected(left[1])).toBe(true);
  });

  it("ignores clicks while a correct match is animating", async () => {
    await renderBoard();
    const { left } = columns();
    clickPair(left[0], partnerOf(left[0]));
    await advance(250);
    click(left[1]);
    expect(isSelected(left[1])).toBe(false);
    await advance(250);
    click(left[1]);
    expect(isSelected(left[1])).toBe(true);
  });

  it("matches by word text, so any cell showing the right word counts", async () => {
    // "Gato" belongs to two pairs; Cat + either Gato cell is correct.
    const pairs = makePairs([
      ["Cat", "Gato"],
      ["Kitty", "Gato"],
      ["Dog", "Perro"],
    ]);
    const { onPairSolved } = await renderBoard({ pairs, numPairs: 3 });
    const gatoCells = cells().filter((c) => c.textContent?.trim() === "Gato");
    expect(gatoCells).toHaveLength(2);
    click("Cat");
    gatoCells[1].click();
    await advance(500);
    expect(onPairSolved).toHaveBeenCalledTimes(1);
    expect(partnerIn(pairs, "Dog")).toBe("Perro");
  });
});

describe("rounds (normal mode)", () => {
  it("deals a fresh round 500ms after the last pair is matched", async () => {
    const { onPairSolved } = await renderBoard();
    const { left } = columns();
    for (const w of left) {
      clickPair(w, partnerOf(w));
      await advance(500);
    }
    expect(onPairSolved).toHaveBeenCalledTimes(5);
    expect(matchedCount()).toBe(10);
    await advance(499);
    expect(matchedCount()).toBe(10);
    // The new round is dealt at 500ms; the old board then fades out (0.3s) before the new one shows.
    await advance(1000);
    expectValidBoard(5);
    expect(matchedCount()).toBe(0);
  });
});

describe("re-dealing", () => {
  const matchOne = async () => {
    const [w] = columns().left;
    clickPair(w, partnerOf(w));
    await advance(500);
    expect(matchedCount()).toBe(2);
  };

  it("re-deals when the refresh trigger changes", async () => {
    const board = await renderBoard();
    await matchOne();
    await board.update({ refreshTrigger: 1 });
    expectValidBoard(5);
    expect(matchedCount()).toBe(0);
  });

  it("re-deals with the new size when the row count changes", async () => {
    const board = await renderBoard();
    await board.update({ numPairs: 7 });
    expectValidBoard(7);
    await board.update({ numPairs: 3 });
    expectValidBoard(3);
  });

  it("re-deals when endless mode is toggled", async () => {
    const board = await renderBoard();
    await matchOne();
    await board.update({ endlessMode: true });
    expect(matchedCount()).toBe(0);
    expectValidBoard(5);
  });

  it("re-deals when mix columns is toggled", async () => {
    const board = await renderBoard();
    await matchOne();
    await board.update({ mixColumns: true });
    expect(matchedCount()).toBe(0);
    expectValidBoard(5);
  });
});

describe("stopping", () => {
  it("clears the current selection", async () => {
    const board = await renderBoard();
    const [w] = columns().left;
    click(w);
    await board.update({ isGameRunning: false });
    expect(isSelected(w)).toBe(false);
  });

  // INTENDED CHANGE (2026-10-06): Stop should deal a fresh board. Today matched cells stay matched (and unclickable)
  // until Refresh. Flip to it() when the rewrite lands.
  it.fails("deals a fresh board", async () => {
    const board = await renderBoard();
    const [w] = columns().left;
    clickPair(w, partnerOf(w));
    await advance(500);
    await board.update({ isGameRunning: false });
    expect(matchedCount()).toBe(0);
  });
});

describe("endless mode (Duolingo-style, not built yet)", () => {
  it.todo("a matched pair flashes, then fades to two blank slots without shifting the layout");
  it.todo("about 1s after each match (0.6s with fast animations) a new pair appears in a random blank left and right slot");
  it.todo("the player can keep matching while blanks are waiting to be refilled");
  it.todo("never deals a pair that's on screen or matched and still waiting to be refilled");
  it.todo("with rows + 1 pairs there is always a pair to deal");
  it.todo("the board stays valid over a long fast game (no freeze)");
});

// Keep the helper import used even if tests above change.
void cell;
