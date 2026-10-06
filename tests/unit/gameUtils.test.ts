import { afterEach, describe, expect, it, vi } from "vitest";

import type { Pair } from "@/constants";
import { getRandomPair, getRandomUniquePairs, initializePairListColumns } from "@/utils/gameUtils";

const makePairs = (words: [string, string][]): Pair[] =>
  words.map(([word1, word2], i) => ({ id: `p${i}`, user_id: "u", word1, word2, tag_ids: [] }));

const PAIRS = makePairs([
  ["Cat", "Gato"],
  ["Dog", "Perro"],
  ["House", "Casa"],
  ["Water", "Agua"],
  ["Book", "Libro"],
  ["Sun", "Sol"],
  ["Moon", "Luna"],
  ["Tree", "Árbol"],
]);

afterEach(() => vi.restoreAllMocks());

describe("getRandomUniquePairs", () => {
  it("returns the requested number of distinct pairs from the list", () => {
    for (let run = 0; run < 50; run++) {
      const picked = getRandomUniquePairs(PAIRS, 5);
      expect(picked).toHaveLength(5);
      expect(new Set(picked.map((p) => p.id)).size).toBe(5);
      picked.forEach((p) => expect(PAIRS).toContain(p));
    }
  });

  it("does not mutate the input", () => {
    const copy = [...PAIRS];
    getRandomUniquePairs(PAIRS, 5);
    expect(PAIRS).toEqual(copy);
  });
});

describe("getRandomPair", () => {
  it("never returns an excluded pair", () => {
    const excluded = PAIRS.slice(0, 6);
    for (let run = 0; run < 50; run++) {
      const pair = getRandomPair(PAIRS, excluded);
      expect(["p6", "p7"]).toContain(pair.id);
    }
  });

  it("returns undefined when every pair is excluded", () => {
    expect(getRandomPair(PAIRS, PAIRS)).toBeUndefined();
  });
});

describe("initializePairListColumns", () => {
  const round = PAIRS.slice(0, 5);

  it("puts one word of each pair in each column, all unmatched", () => {
    const { left, right } = initializePairListColumns(round, false);
    expect(left).toHaveLength(5);
    expect(right).toHaveLength(5);
    for (const pair of round) {
      const l = left.find((w) => w.id === pair.id)!;
      const r = right.find((w) => w.id === pair.id)!;
      expect([l.word, r.word].sort()).toEqual([pair.word1, pair.word2].sort());
    }
    [...left, ...right].forEach((w) => expect(w).toMatchObject({ isMatched: false, isAnimating: false }));
  });

  it("keeps word1 on the left when mixing is off", () => {
    const { left, right } = initializePairListColumns(round, false);
    expect(left.map((w) => w.word).sort()).toEqual(round.map((p) => p.word1).sort());
    expect(right.map((w) => w.word).sort()).toEqual(round.map((p) => p.word2).sort());
  });

  it("swaps sides when mixing is on and the coin flip says so", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1); // < 0.5 → swap every pair
    const { left } = initializePairListColumns(round, true);
    expect(left.map((w) => w.word).sort()).toEqual(round.map((p) => p.word2).sort());
  });
});
