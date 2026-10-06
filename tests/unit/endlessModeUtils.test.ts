import { describe, expect, it } from "vitest";

import type { Pair } from "@/constants";
import type { WordState } from "@/components/PairListColumns";
import { processEndlessMode } from "@/utils/endlessModeUtils";
import { initializePairListColumns } from "@/utils/gameUtils";

const PAIRS: Pair[] = [
  ["Cat", "Gato"],
  ["Dog", "Perro"],
  ["House", "Casa"],
  ["Water", "Agua"],
  ["Book", "Libro"],
  ["Sun", "Sol"],
  ["Moon", "Luna"],
  ["Tree", "Árbol"],
].map(([word1, word2], i) => ({ id: `p${i}`, user_id: "u", word1, word2, tag_ids: [] }));

const partnerOf = (word: string) => {
  const p = PAIRS.find((x) => x.word1 === word || x.word2 === word)!;
  return p.word1 === word ? p.word2 : p.word1;
};

// Simulates matching the pair whose left word sits at `leftIndex`.
function selectionFor(left: WordState[], right: WordState[], leftIndex: number) {
  const l = left[leftIndex];
  const r = right.find((w) => w.word === partnerOf(l.word))!;
  return { left: l.word, right: r.word, leftId: l.id, rightId: r.id, matchResult: null };
}

function startRound(mixColumns: boolean) {
  const roundPairs = PAIRS.slice(0, 5);
  const { left, right } = initializePairListColumns(roundPairs, mixColumns);
  return { left, right, roundPairs };
}

describe("processEndlessMode", () => {
  it("only marks the pair as matched after the first match", () => {
    const { left, right, roundPairs } = startRound(false);
    const result = processEndlessMode({
      leftColumn: left,
      rightColumn: right,
      pair: selectionFor(left, right, 0),
      currentRoundPairs: roundPairs,
      pairs: PAIRS,
      mixColumns: false,
    })!;

    expect(result.newLeftColumn.filter((w) => w.isMatched)).toHaveLength(1);
    expect(result.newRightColumn.filter((w) => w.isMatched)).toHaveLength(1);
    expect(result.updatedRoundPairs).toBe(roundPairs);
  });

  for (const mixColumns of [false, true]) {
    it(`refills both matched slots after the second match (mixColumns=${mixColumns})`, () => {
      // Randomized internally, so repeat to cover different picks.
      for (let run = 0; run < 200; run++) {
        const { left, right, roundPairs } = startRound(mixColumns);
        const first = processEndlessMode({
          leftColumn: left,
          rightColumn: right,
          pair: selectionFor(left, right, 0),
          currentRoundPairs: roundPairs,
          pairs: PAIRS,
          mixColumns,
        })!;
        const { newLeftColumn: l1, newRightColumn: r1 } = first;
        const result = processEndlessMode({
          leftColumn: l1,
          rightColumn: r1,
          pair: selectionFor(l1, r1, 1),
          currentRoundPairs: first.updatedRoundPairs,
          pairs: PAIRS,
          mixColumns,
        })!;

        const { newLeftColumn: L, newRightColumn: R, updatedRoundPairs } = result;
        // Column sizes and round size are stable, and nothing is left marked as matched.
        expect(L).toHaveLength(5);
        expect(R).toHaveLength(5);
        expect(updatedRoundPairs).toHaveLength(5);
        [...L, ...R].forEach((w) => expect(w.isMatched).toBe(false));
        // Exactly the two matched slots changed in each column.
        expect(L.filter((w, i) => w.word !== left[i].word)).toHaveLength(2);
        expect(R.filter((w, i) => w.word !== right[i].word)).toHaveLength(2);
        // No word appears twice on screen, and every left word's partner is in the right column.
        const onScreen = [...L, ...R].map((w) => w.word);
        expect(new Set(onScreen).size).toBe(10);
        L.forEach((w) => expect(R.map((r) => r.word)).toContain(partnerOf(w.word)));
        // The round's pairs are exactly the pairs on screen.
        const roundWords = updatedRoundPairs.flatMap((p) => [p.word1, p.word2]).sort();
        expect(roundWords).toEqual([...onScreen].sort());
        // Refilled cells get fresh ids derived from the pair id.
        L.filter((w, i) => w.word !== left[i].word).forEach((w) => expect(w.id).toMatch(/^p\d+_[A-Za-z0-9]{4}$/));
      }
    });
  }

  // Regression test: with mix columns on, a pair shown swapped (word2 on the left) used to stay in the round's
  for (const mixColumns of [false, true]) {
    it(`keeps the round in sync with the board over a long game, and deals every pair again (mixColumns=${mixColumns})`, () => {
      for (let game = 0; game < 50; game++) {
        let { left, right, roundPairs } = startRound(mixColumns);
        const seenPairIds = new Set(roundPairs.map((p) => p.id));
        for (let match = 0; match < 40; match++) {
          const leftIndex = left.findIndex((w) => !w.isMatched);
          const result = processEndlessMode({
            leftColumn: left,
            rightColumn: right,
            pair: selectionFor(left, right, leftIndex),
            currentRoundPairs: roundPairs,
            pairs: PAIRS,
            mixColumns,
          })!;
          ({ newLeftColumn: left, newRightColumn: right, updatedRoundPairs: roundPairs } = result);
          roundPairs.forEach((p) => seenPairIds.add(p.id));

          expect(roundPairs).toHaveLength(5);
          const onScreen = [...left, ...right].map((w) => w.word).sort();
          expect(roundPairs.flatMap((p) => [p.word1, p.word2]).sort()).toEqual(onScreen);
        }
        expect(seenPairIds.size).toBe(PAIRS.length);
      }
    });
  }
});
