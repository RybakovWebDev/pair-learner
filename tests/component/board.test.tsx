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

    // The two flashing words are locked just before 700ms...
    await advance(699);
    click(left[0]);
    expect(isSelected(left[0])).toBe(false);
    // ...and playable right after, with nothing matched or selected.
    await advance(1);
    expect(isMatched(left[0])).toBe(false);
    expect(isMatched(wrong)).toBe(false);
    click(left[0]);
    expect(isSelected(left[0])).toBe(true);
  });

  it("releases a wrong pair after 400ms with fast animations", async () => {
    await renderBoard({ fastAnimations: true });
    const { left, right } = columns();
    clickPair(left[0], right.find((r) => r !== partnerOf(left[0]))!);
    await advance(399);
    click(left[0]);
    expect(isSelected(left[0])).toBe(false);
    await advance(1);
    click(left[0]);
    expect(isSelected(left[0])).toBe(true);
  });

  // Changed 2026-11-09: clicks used to be ignored on the whole board while any pick was flashing.
  it("lets the player pick other words while a pick is flashing", async () => {
    const { onPairSolved, onPairMistake } = await renderBoard();
    const { left, right } = columns();
    clickPair(left[0], partnerOf(left[0]));
    await advance(100);
    click(left[1]);
    expect(isSelected(left[1])).toBe(true);
    click(partnerOf(left[1]));
    expect(onPairSolved).toHaveBeenCalledTimes(2);
    // A wrong pick during the second flash, too.
    await advance(100);
    clickPair(left[2], right.find((r) => r !== partnerOf(left[2]) && r !== partnerOf(left[0]) && r !== partnerOf(left[1]))!);
    expect(onPairMistake).toHaveBeenCalledTimes(1);
    // Each flash ends on its own time: the first at 500ms, the second at 600ms, the wrong one at 900ms.
    await advance(299); // 499ms
    expect(isMatched(left[0])).toBe(false);
    await advance(1); // 500ms
    expect(isMatched(left[0])).toBe(true);
    expect(isMatched(left[1])).toBe(false);
    await advance(100); // 600ms
    expect(isMatched(left[1])).toBe(true);
    // The wrong pick's words are still locked until 900ms, then playable again.
    click(left[2]);
    expect(isSelected(left[2])).toBe(false);
    await advance(300);
    click(left[2]);
    expect(isSelected(left[2])).toBe(true);
    expect(isMatched(left[2])).toBe(false);
  });

  it("locks the flashing words, but not the rest", async () => {
    await renderBoard();
    const { left } = columns();
    clickPair(left[0], partnerOf(left[0]));
    await advance(250);
    click(left[0]);
    expect(isSelected(left[0])).toBe(false);
    click(partnerOf(left[0]));
    expect(isSelected(partnerOf(left[0]))).toBe(false);
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

describe("switching boards", () => {
  // Regression test: the old board used to be remounted when it started fading out, which replayed its own fade-in
  // and showed as a pause halfway through the fade.
  it("fades the old board out in place, without rebuilding it", async () => {
    const board = await renderBoard();
    const before = document.querySelector("section");
    await board.update({ endlessMode: true }, 10);
    expect(document.querySelector("section")).toBe(before);
    await advance(300);
    expect(document.querySelector("section")).not.toBe(before);
    expectValidBoard(5);
  });
});

describe("stopping", () => {
  it("clears the current selection", async () => {
    const board = await renderBoard();
    const [w] = columns().left;
    click(w);
    expect(isSelected(w)).toBe(true);
    await board.update({ isGameRunning: false });
    expect(cells().filter((c) => c.getAttribute("aria-pressed") === "true")).toHaveLength(0);
  });

  // Changed 2026-10-06: Stop used to leave matched cells matched (and unclickable) until Refresh.
  it("deals a fresh board", async () => {
    const board = await renderBoard();
    const [w] = columns().left;
    clickPair(w, partnerOf(w));
    await advance(500);
    await board.update({ isGameRunning: false });
    expect(matchedCount()).toBe(0);
  });
});

describe("endless mode (Duolingo Match Madness style)", () => {
  // Left-column words that can still be picked.
  const open = () => columns().left.filter((w) => !isMatched(w));

  it("a matched pair stays on the board as matched, then is replaced 5s after its flash", async () => {
    const { onPairSolved } = await renderBoard({ endlessMode: true });
    const [w] = open();
    clickPair(w, partnerOf(w));
    expect(onPairSolved).toHaveBeenCalledTimes(1);
    await advance(500);
    expect(isMatched(w)).toBe(true);
    expect(cells()).toHaveLength(10);
    await advance(4999);
    expect(isMatched(w)).toBe(true);
    await advance(1);
    expect(words()).not.toContain(w);
    expect(matchedCount()).toBe(0);
    expectValidBoard(5);
  });

  it("a matched pair can't be picked while it fades out", async () => {
    const { onPairSolved } = await renderBoard({ endlessMode: true });
    const [w] = open();
    clickPair(w, partnerOf(w));
    await advance(500);
    clickPair(w, partnerOf(w));
    await advance(500);
    expect(onPairSolved).toHaveBeenCalledTimes(1);
  });

  it("replaces a pair matched while another fades together with it, at the first one's time", async () => {
    await renderBoard({ endlessMode: true });
    const [a] = open();
    clickPair(a, partnerOf(a));
    await advance(3000);
    const [b] = open();
    clickPair(b, partnerOf(b));
    await advance(2499); // 5.5s after the first match is 1ms away
    expect(isMatched(a)).toBe(true);
    expect(isMatched(b)).toBe(true);
    await advance(1);
    expect(words()).not.toContain(a);
    expect(words()).not.toContain(b);
    expect(matchedCount()).toBe(0);
  });

  it("replaces all matched pairs together 1s (0.6s fast) after half the board is matched", async () => {
    for (const fast of [false, true]) {
      await renderBoard({ endlessMode: true, fastAnimations: fast });
      const flash = fast ? 250 : 500;
      const gone: string[] = [];
      for (let i = 0; i < 3; i++) {
        const [w] = open();
        gone.push(w);
        clickPair(w, partnerOf(w));
        if (i < 2) await advance(flash);
      }
      await advance((fast ? 600 : 1000) - 1);
      expect(matchedCount()).toBe(6);
      await advance(1);
      expect(matchedCount()).toBe(0);
      for (const w of gone) expect(words()).not.toContain(w);
      expectValidBoard(5);
      cleanup();
    }
  });

  it("never deals a pair that's on screen, and prefers one that isn't leaving", async () => {
    // 6 pairs, 5 rows: the only fresh pair is the one that wasn't on the board.
    const pairs = PAIRS.slice(0, 6);
    await renderBoard({ endlessMode: true, pairs });
    const offBoard = pairs.find((p) => !words().includes(p.word1))!;
    const [w] = open();
    clickPair(w, partnerOf(w));
    await advance(5500);
    expect(words()).toContain(offBoard.word1);
    expect(words()).toContain(offBoard.word2);
    expect(words()).not.toContain(w);
  });

  it("stays valid through a long, fast game", async () => {
    const { onPairSolved } = await renderBoard({ endlessMode: true, fastAnimations: true });
    let made = 0;
    for (let i = 0; i < 60; i++) {
      const [w] = open();
      if (w) {
        clickPair(w, partnerOf(w));
        made++;
      }
      await advance(260); // just past the 250ms flash, then straight into the next pick
      const { left: l, right: r } = columns();
      expect(l.length).toBe(r.length);
      for (const word of l) expect(r).toContain(partnerOf(word));
      expect(new Set(words()).size).toBe(words().length);
    }
    expect(onPairSolved).toHaveBeenCalledTimes(made);
    await advance(6000);
    expectValidBoard(5);
    expect(matchedCount()).toBe(0);
  });
});

// Keep the helper import used even if tests above change.
void cell;
