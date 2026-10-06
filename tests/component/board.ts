import { act, fireEvent, render } from "@testing-library/react";
import { createElement, type ComponentProps } from "react";
import { vi } from "vitest";

import PairList from "@/components/PairList";
import type { Pair } from "@/constants";

export const makePairs = (words: [string, string][]): Pair[] =>
  words.map(([word1, word2], i) => ({ id: `p${i}`, user_id: "u", word1, word2, tag_ids: [] }));

export const PAIRS = makePairs([
  ["Cat", "Gato"],
  ["Dog", "Perro"],
  ["House", "Casa"],
  ["Water", "Agua"],
  ["Book", "Libro"],
  ["Sun", "Sol"],
  ["Moon", "Luna"],
  ["Tree", "Árbol"],
]);

export function partnerIn(pairs: Pair[], word: string) {
  const p = pairs.find((x) => x.word1 === word || x.word2 === word);
  if (!p) throw new Error(`No pair for ${word}`);
  return p.word1 === word ? p.word2 : p.word1;
}
export const partnerOf = (word: string) => partnerIn(PAIRS, word);

type BoardProps = ComponentProps<typeof PairList>;

// Renders the board the way the Learn page does, with fake timers so timing rules can be checked exactly.
export async function renderBoard(overrides: Partial<BoardProps> = {}) {
  vi.useFakeTimers();
  const onPairSolved = vi.fn();
  const onPairMistake = vi.fn();
  let props: BoardProps = {
    pairs: PAIRS,
    numPairs: 5,
    isGameRunning: true,
    endlessMode: false,
    mixColumns: false,
    fastAnimations: false,
    showSparkles: true,
    refreshTrigger: 0,
    onPairSolved,
    onPairMistake,
    ...overrides,
  };
  const view = render(createElement(PairList, props));
  await advance(50);
  return {
    onPairSolved,
    onPairMistake,
    async update(changes: Partial<BoardProps>) {
      props = { ...props, ...changes };
      view.rerender(createElement(PairList, props));
      // A re-deal fades the old board out (0.3s) before the new one appears.
      await advance(1000);
    },
  };
}

export const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

// Board cells are the only buttons with aria-pressed. Left column first, then right.
export const cells = () => [...document.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")];
export const words = () => cells().map((c) => c.textContent!.trim());
export const columns = () => {
  const w = words();
  return { left: w.slice(0, w.length / 2), right: w.slice(w.length / 2) };
};
export const cell = (word: string) => {
  const found = cells().filter((c) => c.textContent?.trim() === word);
  if (found.length !== 1) throw new Error(`Expected one cell "${word}", found ${found.length}`);
  return found[0];
};
export const isMatched = (word: string) => cell(word).getAttribute("aria-label")!.includes("matched");
export const isSelected = (word: string) => cell(word).getAttribute("aria-pressed") === "true";
export const matchedCount = () => cells().filter((c) => c.getAttribute("aria-label")!.includes("matched")).length;

export const click = (word: string) => fireEvent.click(cell(word));
export const clickPair = (a: string, b: string) => {
  click(a);
  click(b);
};
