import { describe, expect, it } from "vitest";

import type { Pair } from "@/constants";
import {
  advance,
  deal,
  isFlashing,
  leavesAt,
  nextDueAt,
  select,
  setFastAnimations,
  TIMINGS,
  type BoardConfig,
  type BoardState,
  type Cell,
  type Rng,
  type Side,
} from "@/game/engine";
import { PAIR_SETS, pairsFrom } from "../fixtures/pairs";
import { canClearBoard, correctPicks } from "../fixtures/board-rules";

// Deterministic random numbers, so failures can be replayed from the seed.
function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const makePairs = (n: number): Pair[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, user_id: "u", word1: `w${i}`, word2: `v${i}`, tag_ids: [] }));

const config = (over: Partial<BoardConfig> = {}): BoardConfig => ({
  pairs: makePairs(8),
  rows: 5,
  mixColumns: false,
  endless: false,
  fastAnimations: false,
  ...over,
});

const cells = (s: BoardState, side: "left" | "right") => s[side];
const partnerKey = (s: BoardState, leftCell: Cell) => cells(s, "right").find((c) => c.pairId === leftCell.pairId)!.key;

function pickCorrect(s: BoardState, now: number, index = 0) {
  const l = cells(s, "left").filter((c) => !c.matched && !isFlashing(s, c.key))[index];
  return select(select(s, "left", l.key, now), "right", partnerKey(s, l), now);
}

/** Board rules that must hold at every moment. */
function expectValid(s: BoardState) {
  const L = cells(s, "left");
  const R = cells(s, "right");
  expect(s.left).toHaveLength(s.config.rows);
  expect(s.right).toHaveLength(s.config.rows);
  expect(L.length).toBe(R.length);
  // Each pair on the board shows exactly one word per column.
  const leftIds = L.map((c) => c.pairId).sort();
  expect(R.map((c) => c.pairId).sort()).toEqual(leftIds);
  expect(new Set(leftIds).size).toBe(leftIds.length);
  // Endless mode: matched cells always have a replacement coming. (A replacement can also be scheduled while the
  // newest match is still flashing, so the reverse doesn't hold.)
  if (s.config.endless && L.some((c) => c.matched)) expect(s.replaceAt).not.toBeNull();
}

describe("deal", () => {
  it("deals `rows` pairs with one word per column and unique keys", () => {
    for (let seed = 0; seed < 50; seed++) {
      const s = deal(config({ rows: 3 + (seed % 6) }), 1, seeded(seed));
      expectValid(s);
      const keys = [...cells(s, "left"), ...cells(s, "right")].map((c) => c.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("puts word1 on the left unless mixing columns", () => {
    const s = deal(config(), 1, seeded(1));
    for (const c of cells(s, "left")) expect(c.word.startsWith("w")).toBe(true);
    const mixed = Array.from({ length: 20 }, (_, i) => deal(config({ mixColumns: true }), 1, seeded(i)));
    expect(mixed.some((m) => cells(m, "left").some((c) => c.word.startsWith("v")))).toBe(true);
  });

  it("deals nothing when there are fewer pairs than rows", () => {
    const s = deal(config({ pairs: makePairs(3), rows: 5 }), 1, seeded(1));
    expect(s.left).toEqual([]);
  });
});

describe("selecting and resolving", () => {
  it("toggles and moves the selection within a column", () => {
    let s = deal(config(), 1, seeded(1));
    const [a, b] = cells(s, "left");
    s = select(s, "left", a.key, 0);
    expect(s.selected.left).toBe(a.key);
    s = select(s, "left", a.key, 0);
    expect(s.selected.left).toBeNull();
    s = select(select(s, "left", a.key, 0), "left", b.key, 0);
    expect(s.selected.left).toBe(b.key);
  });

  it("resolves a correct pick after 500ms (250ms fast) and a wrong one after 700ms (400ms fast)", () => {
    for (const fast of [false, true]) {
      const s0 = deal(config({ fastAnimations: fast }), 1, seeded(2));
      const right = pickCorrect(s0, 1000);
      expect(right.resolutions.at(-1)?.correct).toBe(true);
      expect(nextDueAt(right)).toBe(1000 + TIMINGS.correct[fast ? "fast" : "normal"]);

      const [l] = cells(s0, "left");
      const wrongKey = cells(s0, "right").find((c) => c.pairId !== l.pairId)!.key;
      const wrong = select(select(s0, "left", l.key, 1000), "right", wrongKey, 1000);
      expect(wrong.resolutions.at(-1)?.correct).toBe(false);
      expect(nextDueAt(wrong)).toBe(1000 + TIMINGS.wrong[fast ? "fast" : "normal"]);
    }
  });

  // Changed 2026-11-09: clicks used to be ignored on the whole board while any pick was resolving.
  it("ignores clicks on flashing and matched cells, but not on the rest", () => {
    let s = pickCorrect(deal(config(), 1, seeded(3)), 0);
    const [flashing] = cells(s, "left");
    const other = cells(s, "left")[1];
    expect(select(s, "left", flashing.key, 100)).toBe(s);
    expect(select(s, "left", other.key, 100).selected.left).toBe(other.key);
    s = advance(s, 500, seeded(3));
    const matched = cells(s, "left").find((c) => c.matched)!;
    expect(select(s, "left", matched.key, 600)).toBe(s);
  });

  it("matches by word text", () => {
    const pairs: Pair[] = [
      { id: "a", user_id: "u", word1: "Cat", word2: "Gato", tag_ids: [] },
      { id: "b", user_id: "u", word1: "Kitty", word2: "Gato", tag_ids: [] },
      { id: "c", user_id: "u", word1: "Dog", word2: "Perro", tag_ids: [] },
    ];
    let s = deal(config({ pairs, rows: 3 }), 1, seeded(4));
    const cat = cells(s, "left").find((c) => c.word === "Cat")!;
    const kittysGato = cells(s, "right").find((c) => c.word === "Gato" && c.pairId === "b")!;
    s = select(select(s, "left", cat.key, 0), "right", kittysGato.key, 0);
    expect(s.resolutions.at(-1)?.correct).toBe(true);
  });
});

describe("normal mode", () => {
  it("keeps matched pairs, then deals a new round 500ms after the last match", () => {
    let s = deal(config(), 1, seeded(5));
    let now = 0;
    for (let i = 0; i < 5; i++) {
      s = advance(pickCorrect(s, now), now + 500, seeded(i));
      now += 500;
    }
    expect(cells(s, "left").every((c) => c.matched)).toBe(true);
    expect(s.nextRoundAt).toBe(now + 500);
    expect(advance(s, now + 499, seeded(9)).dealId).toBe(1);
    const next = advance(s, now + 500, seeded(9));
    expect(next.dealId).toBe(2);
    expect(cells(next, "left").some((c) => c.matched)).toBe(false);
    expectValid(next);
  });
});

const matchedCount = (s: BoardState) => s.left.filter((c) => c.matched).length;
const flash = (s: BoardState) => TIMINGS.correct[s.config.fastAnimations ? "fast" : "normal"];

/** Makes `count` correct matches, each one as soon as the previous flash is over. Returns the time of the last match. */
function clearPairs(s: BoardState, count: number, start: number, rng: Rng) {
  let now = start;
  for (let i = 0; i < count; i++) {
    if (i > 0) now += flash(s);
    s = advance(s, now, rng);
    s = pickCorrect(s, now);
  }
  s = advance(s, now + flash(s), rng);
  return { s, lastMatchAt: now };
}

describe("endless mode", () => {
  it("keeps a matched pair on the board, fading out, and replaces it 5s after its flash ends", () => {
    let s = deal(config({ endless: true }), 1, seeded(6));
    const matched = cells(s, "left")[0];
    const row = 0;
    s = pickCorrect(s, 1000);
    s = advance(s, 1500, seeded(6));
    expect(s.left[row].key).toBe(matched.key);
    expect(s.left[row].matched).toBe(true);
    expect(leavesAt(s, s.left[row])).toBe(6500);
    expectValid(s);
    expect(nextDueAt(s)).toBe(6500);
    expect(matchedCount(advance(s, 6499, seeded(6)))).toBe(1);
    s = advance(s, 6500, seeded(6));
    expect(matchedCount(s)).toBe(0);
    // A lone pair can only go back into its own row on the left.
    expect(s.left[row].pairId).not.toBe(matched.pairId);
    expectValid(s);
  });

  it("replaces a pair matched while another is fading together with it, at the first one's time", () => {
    let s = deal(config({ endless: true, rows: 8, pairs: makePairs(12) }), 1, seeded(3));
    const first = cells(s, "left")[0].key;
    s = advance(pickCorrect(s, 0), 3000, seeded(3));
    s = advance(pickCorrect(s, 3000), 3500, seeded(3));
    expect(matchedCount(s)).toBe(2);
    for (const c of s.left.filter((c) => c.matched)) expect(leavesAt(s, c)).toBe(5500);
    expect(matchedCount(advance(s, 5499, seeded(3)))).toBe(2);
    s = advance(s, 5500, seeded(3));
    expect(matchedCount(s)).toBe(0);
    expect(s.left.some((c) => c.key === first)).toBe(false);
    expectValid(s);
  });

  it("gives a pair matched just before the replacement at least the short fade, and replaces both together", () => {
    for (const fast of [false, true]) {
      let s = deal(config({ endless: true, rows: 8, pairs: makePairs(12), fastAnimations: fast }), 1, seeded(5));
      const firstEnd = TIMINGS.correct[fast ? "fast" : "normal"];
      s = advance(pickCorrect(s, 0), firstEnd, seeded(5));
      const due = firstEnd + TIMINGS.refillIdle;
      // Matched 100ms before the first pair would have gone.
      s = pickCorrect(s, due - 100);
      const replaceAt = due - 100 + TIMINGS.refill[fast ? "fast" : "normal"];
      expect(nextDueAt(advance(s, due, seeded(5)))).not.toBe(due);
      s = advance(s, replaceAt - 1, seeded(5));
      expect(matchedCount(s)).toBe(2);
      for (const c of s.left.filter((c) => c.matched)) expect(leavesAt(s, c)).toBe(replaceAt);
      s = advance(s, replaceAt, seeded(5));
      expect(matchedCount(s)).toBe(0);
      expectValid(s);
    }
  });

  it("replaces all matched pairs together 1s (0.6s fast) after the match that makes half the board matched", () => {
    for (const fast of [false, true]) {
      for (const rows of [3, 4, 5, 8]) {
        const half = Math.ceil(rows / 2);
        const cfg = config({ endless: true, fastAnimations: fast, rows, pairs: makePairs(rows + 4) });
        // One match short of half: they wait for 5s after the first flash.
        const short = clearPairs(deal(cfg, 1, seeded(rows)), half - 1, 0, seeded(rows));
        expect(short.s.replaceAt).toBe(flash(short.s) + TIMINGS.refillIdle);
        // The match that makes it half.
        let { s, lastMatchAt } = clearPairs(deal(cfg, 1, seeded(rows)), half, 0, seeded(rows));
        expect(matchedCount(s)).toBe(half);
        const batchAt = lastMatchAt + TIMINGS.refill[fast ? "fast" : "normal"];
        expect(nextDueAt(s)).toBe(batchAt);
        // Every matched pair now finishes fading at the same moment.
        for (const c of s.left.filter((c) => c.matched)) expect(leavesAt(s, c)).toBe(batchAt);
        expect(matchedCount(advance(s, batchAt - 1, seeded(1)))).toBe(half);
        s = advance(s, batchAt, seeded(1));
        expect(matchedCount(s)).toBe(0);
        expectValid(s);
      }
    }
  });

  it("includes pairs matched while a batch is coming", () => {
    // Fast mode: the 250ms flash ends before the 600ms batch, so a fourth match can land in between.
    let { s, lastMatchAt } = clearPairs(deal(config({ endless: true, fastAnimations: true }), 1, seeded(4)), 3, 0, seeded(4));
    ({ s, lastMatchAt } = clearPairs(s, 1, lastMatchAt + 250, seeded(4)));
    expect(matchedCount(s)).toBe(4);
    expect(s.replaceAt).toBe(lastMatchAt + TIMINGS.refill.fast);
    s = advance(s, s.replaceAt!, seeded(4));
    expect(matchedCount(s)).toBe(0);
    expectValid(s);
  });

  it("never deals a pair that's on screen, and prefers one that isn't leaving", () => {
    for (let seed = 0; seed < 200; seed++) {
      let s = deal(config({ endless: true, pairs: makePairs(6), rows: 5 }), 1, seeded(seed));
      const matchedId = cells(s, "left")[0].pairId;
      s = pickCorrect(s, 0);
      s = advance(s, 10_000, seeded(seed + 1000));
      // With 6 pairs and 5 rows, the pair that wasn't on the board is the only fresh one.
      const onBoard = cells(s, "left").map((c) => c.pairId);
      expect(onBoard).not.toContain(matchedId);
      expect(new Set(onBoard).size).toBe(5);
    }
  });

  it("deals leaving pairs again when there aren't enough others", () => {
    // 6 pairs, 5 rows, 3 leaving: 2 stay, 1 fresh pair, so 2 of the 3 leaving ones come back.
    for (let seed = 0; seed < 50; seed++) {
      const pairs = makePairs(6);
      let s = deal(config({ endless: true, pairs, rows: 5 }), 1, seeded(seed));
      const fresh = pairs.find((p) => !cells(s, "left").some((c) => c.pairId === p.id))!;
      ({ s } = clearPairs(s, 3, 0, seeded(seed)));
      s = advance(s, 10_000, seeded(seed));
      expect(matchedCount(s)).toBe(0);
      expect(cells(s, "left").map((c) => c.pairId)).toContain(fresh.id);
      expectValid(s);
    }
  });

  it("puts replacement pairs in random freed slots, left and right shuffled separately", () => {
    let sameRow = 0;
    const layouts = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      let { s } = clearPairs(deal(config({ endless: true, pairs: makePairs(12) }), 1, seeded(seed)), 3, 0, seeded(seed));
      const freed = s.left.flatMap((c, i) => (c.matched ? [i] : []));
      s = advance(s, 10_000, seeded(seed + 500));
      const newPairs = freed.map((i) => s.left[i].pairId);
      const rightRows = newPairs.map((id) => s.right.findIndex((c) => c.pairId === id));
      newPairs.forEach((_, i) => rightRows[i] === freed[i] && sameRow++);
      layouts.add(rightRows.join());
    }
    // A pair's two words land in the same row only by chance, and the layout varies.
    expect(sameRow).toBeLessThan(300);
    expect(layouts.size).toBeGreaterThan(20);
  });

  it("deals the leaving pair again when it's the only one not on screen", () => {
    // Fewer pairs than the Learn screen allows (rows + 0, all on screen), but the engine must not loop or break.
    let s = deal(config({ endless: true, pairs: makePairs(5), rows: 5 }), 1, seeded(8));
    s = advance(pickCorrect(s, 0), 500, seeded(8));
    s = advance(s, 5500, seeded(8));
    // The only pair not staying on screen is the leaving one, so it's dealt again as a fresh cell.
    expect(matchedCount(s)).toBe(0);
    expectValid(s);
  });

  it("stays valid over hundreds of random fast and slow games, and always replaces matched pairs in the end", () => {
    for (let game = 0; game < 600; game++) {
      const rng = seeded(game);
      const rows = 3 + (game % 6);
      const pairCount = rows + 1 + (game % 3);
      let s = deal(
        config({ endless: true, rows, pairs: makePairs(pairCount), mixColumns: game % 2 === 0, fastAnimations: game % 4 === 0 }),
        1,
        rng,
      );
      let now = 0;
      for (let step = 0; step < 80; step++) {
        const roll = rng();
        const open = cells(s, "left").filter((c) => !c.matched && !isFlashing(s, c.key));
        if (roll < 0.6 && open.length) {
          s = pickCorrect(s, now, Math.floor(rng() * open.length));
        } else if (roll < 0.7 && open.length > 1) {
          const l = open[0];
          const wrong = cells(s, "right").find((c) => c.pairId !== l.pairId && !c.matched && !isFlashing(s, c.key));
          if (wrong) s = select(select(s, "left", l.key, now), "right", wrong.key, now);
        }
        now += Math.floor(rng() * (step % 10 === 9 ? 7000 : 900)); // mostly quick, sometimes a long pause
        s = advance(s, now, rng);
        expectValid(s);
      }
      // Given time, every matched pair gets replaced.
      s = advance(s, now + 10_000, rng);
      expect(matchedCount(s)).toBe(0);
      expect(s.replaceAt).toBeNull();
    }
  });
});

describe("edge cases", () => {
  /** Picks the first open cells showing these words. */
  const pickWords = (s: BoardState, leftWord: string, rightWord: string, now: number) => {
    const l = s.left.find((c) => !c.matched && c.word === leftWord)!;
    const r = s.right.find((c) => !c.matched && c.word === rightWord)!;
    return select(select(s, "left", l.key, now), "right", r.key, now);
  };

  it("deals an empty board, with nothing scheduled, when there are no pairs or too few", () => {
    for (const pairs of [[], PAIR_SETS.minimum.slice(0, 2)]) {
      const s = deal(config({ pairs, rows: 3 }), 1, seeded(1));
      expect(s.left).toEqual([]);
      expect(s.right).toEqual([]);
      expect(nextDueAt(s)).toBeNull();
      expect(select(s, "left", "missing", 0)).toBe(s);
      expect(advance(s, 60_000, seeded(1))).toBe(s);
    }
  });

  it("uses every pair when the pool is exactly the row count", () => {
    const s = deal(config({ pairs: PAIR_SETS.minimum, rows: 5 }), 1, seeded(2));
    expect(cells(s, "left").map((c) => c.pairId).sort()).toEqual(PAIR_SETS.minimum.map((p) => p.id).sort());
  });

  it("deals varied boards from a large pool", () => {
    const boards = new Set<string>();
    for (let seed = 0; seed < 20; seed++)
      boards.add(deal(config({ pairs: PAIR_SETS.large, rows: 8 }), 1, seeded(seed)).left.map((c) => c.pairId).sort().join());
    expect(boards.size).toBe(20);
  });

  it("treats a pair saved twice as interchangeable: any copy of each word matches", () => {
    const pairs = pairsFrom([
      ["Cat", "Gato"],
      ["Cat", "Gato"],
      ["Dog", "Perro"],
    ]);
    let s = deal(config({ pairs, rows: 3 }), 1, seeded(3));
    let now = 0;
    for (let i = 0; i < 3; i++) {
      const [l, r] = correctPicks(s).find(([l, r]) => l.pairId !== r.pairId) ?? correctPicks(s)[0];
      s = advance(select(select(s, "left", l.key, now), "right", r.key, now), now + 500, seeded(3));
      now += 500;
    }
    expect(s.left.every((c) => c.matched)).toBe(true);
    expect(s.nextRoundAt).toBe(now + TIMINGS.nextRound);
  });

  it("matches a word that's on both sides of its pair", () => {
    const pairs = pairsFrom([
      ["Taxi", "Taxi"],
      ["Cat", "Gato"],
      ["Dog", "Perro"],
    ]);
    let s = deal(config({ pairs, rows: 3 }), 1, seeded(4));
    s = pickWords(s, "Taxi", "Taxi", 0);
    expect(s.resolutions.at(-1)?.correct).toBe(true);
  });

  it("is case- and accent-sensitive", () => {
    const pairs = pairsFrom([
      ["cat", "gato"],
      ["Cat", "Gato"],
      ["Papá", "Dad"],
      ["Papa", "Potato"],
    ]);
    const s = deal(config({ pairs, rows: 4 }), 1, seeded(5));
    expect(pickWords(s, "cat", "Gato", 0).resolutions.at(-1)?.correct).toBe(false);
    expect(pickWords(s, "Papa", "Dad", 0).resolutions.at(-1)?.correct).toBe(false);
    expect(pickWords(s, "Papá", "Dad", 0).resolutions.at(-1)?.correct).toBe(true);
  });

  it("keeps running timers when fast animations are switched, and uses the new speed for the next pick", () => {
    let s = pickCorrect(deal(config(), 1, seeded(6)), 0);
    expect(nextDueAt(s)).toBe(TIMINGS.correct.normal);
    s = setFastAnimations(s, true);
    expect(nextDueAt(s)).toBe(TIMINGS.correct.normal);
    s = advance(s, TIMINGS.correct.normal, seeded(6));
    s = pickCorrect(s, 1000);
    expect(nextDueAt(s)).toBe(1000 + TIMINGS.correct.fast);
    expect(setFastAnimations(s, true)).toBe(s);
  });

  it("mixes columns in endless replacements too", () => {
    const orientations = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      let s = deal(config({ endless: true, mixColumns: true, pairs: makePairs(12) }), 1, seeded(seed));
      const dealtKeys = new Set(s.left.map((c) => c.key));
      s = advance(pickCorrect(s, 0), 10_000, seeded(seed));
      // makePairs words: word1 starts with "w", word2 with "v".
      for (const c of s.left.filter((c) => !dealtKeys.has(c.key))) orientations.add(c.word[0]);
    }
    expect([...orientations].sort()).toEqual(["v", "w"]);
  });

});

describe("shared words (bug 1, fixed 2026-11-09)", () => {
  const pickWords = (s: BoardState, leftWord: string, rightWord: string, now: number) => {
    const l = s.left.find((c) => !c.matched && c.word === leftWord)!;
    const r = s.right.find((c) => !c.matched && c.word === rightWord)!;
    return select(select(s, "left", l.key, now), "right", r.key, now);
  };
  const boardWords = (s: BoardState) => [...s.left, ...s.right].map((c) => c.word);
  const pairWordsOnBoard = (s: BoardState) => {
    const ids = new Set(s.left.map((c) => c.pairId));
    return s.config.pairs.filter((p) => ids.has(p.id)).flatMap((p) => [p.word1, p.word2]);
  };

  it("never deals two pairs that share a word when the pool has enough others", () => {
    // sharedRight has 6 groups of words (Cat/Kitty-Gato, Dog/Puppy-Perro, House/Home-Casa, Water, Book, Sun).
    for (const mixColumns of [false, true])
      for (let seed = 0; seed < 200; seed++) {
        const s = deal(config({ pairs: PAIR_SETS.sharedRight, rows: 6, mixColumns }), 1, seeded(seed));
        const words = pairWordsOnBoard(s);
        expect(new Set(words).size, `seed ${seed}`).toBe(words.length);
      }
  });

  it("never brings a shared word onto the board in endless replacements when the pool has enough others", () => {
    for (let seed = 0; seed < 100; seed++) {
      const rng = seeded(seed);
      let s = deal(config({ pairs: PAIR_SETS.sharedRight, rows: 5, endless: true, mixColumns: seed % 2 === 0 }), 1, rng);
      let now = 0;
      for (let step = 0; step < 40; step++) {
        const picks = correctPicks(s);
        if (picks.length) {
          const [l, r] = picks[Math.floor(rng() * picks.length)];
          s = select(select(s, "left", l.key, now), "right", r.key, now);
        }
        now += Math.floor(rng() * 2000);
        s = advance(s, now, rng);
        const words = boardWords(s);
        expect(new Set(words).size, `seed ${seed}, step ${step}: ${words.join(", ")}`).toBe(words.length);
      }
    }
  });

  it("still deals a full board when shared words can't be avoided", () => {
    const s = deal(config({ pairs: PAIR_SETS.stranding.slice(0, 4), rows: 4 }), 1, seeded(1));
    expect(s.left).toHaveLength(4);
  });

  it("relabels the leftover cells after a cross-pair match, so they still form a pair", () => {
    // Cat-Gato and Kitty-Gato on one board: Cat + Kitty's Gato is correct, and Kitty + the other Gato still is.
    const pairs = pairsFrom([
      ["Cat", "Gato"],
      ["Kitty", "Gato"],
      ["Dog", "Perro"],
    ]);
    for (let seed = 0; seed < 20; seed++) {
      let s = deal(config({ pairs, rows: 3 }), 1, seeded(seed));
      const cat = s.left.find((c) => c.word === "Cat")!;
      const kittysGato = s.right.find((c) => c.word === "Gato" && c.pairId !== cat.pairId)!;
      s = advance(select(select(s, "left", cat.key, 0), "right", kittysGato.key, 0), 500, seeded(seed));
      // The picked cells now share a pair, and the open cells still pair up one per column.
      const matched = [...s.left, ...s.right].filter((c) => c.matched);
      expect(matched[0].pairId).toBe(matched[1].pairId);
      const openLeft = s.left.filter((c) => !c.matched).map((c) => c.pairId).sort();
      expect(s.right.filter((c) => !c.matched).map((c) => c.pairId).sort()).toEqual(openLeft);
      expect(canClearBoard(s)).toBe(true);
      s = advance(pickWords(s, "Kitty", "Gato", 500), 1000, seeded(seed));
      expect(s.resolutions).toEqual([]);
      expect(s.left.filter((c) => c.matched)).toHaveLength(2);
    }
  });

  it("ends a normal round early when shared words leave a word with no partner", () => {
    // Only x-p, y-p, y-q, z-q: matching "y"+"p" twice leaves x and z facing two q's; z+q works, x can't be matched.
    let s = deal(config({ pairs: PAIR_SETS.stranding.slice(0, 4), rows: 4 }), 1, seeded(7));
    s = advance(pickWords(s, "y", "p", 0), 500, seeded(7));
    s = advance(pickWords(s, "y", "p", 500), 1000, seeded(7));
    expect(s.nextRoundAt).toBeNull();
    s = advance(pickWords(s, "z", "q", 1000), 1500, seeded(7));
    expect(s.left.find((c) => c.word === "x")!.matched).toBe(false);
    expect(s.nextRoundAt).toBe(1500 + TIMINGS.nextRound);
    expect(advance(s, 2000, seeded(7)).dealId).toBe(2);
  });

  it("lets stranded words leave with the matched ones in endless mode", () => {
    // The same four pairs on a 4-row endless board (the engine allows it; the Learn screen would cap rows at 3).
    let s = deal(config({ pairs: PAIR_SETS.stranding.slice(0, 4), rows: 4, endless: true }), 1, seeded(7));
    s = advance(pickWords(s, "y", "p", 0), 500, seeded(7));
    s = advance(pickWords(s, "y", "p", 500), 1000, seeded(7));
    s = advance(pickWords(s, "z", "q", 1000), 1500, seeded(7));
    // Nothing correct is left, so the stranded x and q leave too, and everything is replaced together.
    expect(s.left.every((c) => c.matched)).toBe(true);
    expect(s.replaceAt).not.toBeNull();
    s = advance(s, s.replaceAt!, seeded(7));
    expect(s.left.some((c) => c.matched)).toBe(false);
  });
});

describe("overlapping picks (added 2026-11-09)", () => {
  const wrongPartnerKey = (s: BoardState, l: Cell) =>
    s.right.find((c) => c.pairId !== l.pairId && !c.matched && !isFlashing(s, c.key))!.key;
  const pickWrong = (s: BoardState, now: number, index = 0) => {
    const l = s.left.filter((c) => !c.matched && !isFlashing(s, c.key))[index];
    return select(select(s, "left", l.key, now), "right", wrongPartnerKey(s, l), now);
  };

  it("lets the player pick while other picks flash, and finishes each on its own time", () => {
    for (const fast of [false, true]) {
      const flash = TIMINGS.correct[fast ? "fast" : "normal"];
      let s = deal(config({ fastAnimations: fast }), 1, seeded(1));
      s = pickCorrect(s, 0);
      const first = s.resolutions[0];
      s = pickCorrect(s, 100);
      expect(s.resolutions).toHaveLength(2);
      expect(nextDueAt(s)).toBe(flash);
      s = advance(s, flash, seeded(1));
      expect(s.resolutions).toHaveLength(1);
      expect(s.left.find((c) => c.key === first.leftKey)!.matched).toBe(true);
      expect(s.left.filter((c) => c.matched)).toHaveLength(1);
      s = advance(s, flash + 100, seeded(1));
      expect(s.resolutions).toHaveLength(0);
      expect(s.left.filter((c) => c.matched)).toHaveLength(2);
      expectValid(s);
    }
  });

  it("locks a wrong pick's words for its flash while a correct pick is matched meanwhile", () => {
    let s = deal(config(), 1, seeded(2));
    s = pickWrong(s, 0);
    const wrong = s.resolutions[0];
    s = pickCorrect(s, 50);
    // The wrong pick's words can't be clicked until 700ms.
    expect(select(s, "left", wrong.leftKey, 100)).toBe(s);
    s = advance(s, 550, seeded(2));
    expect(s.left.filter((c) => c.matched)).toHaveLength(1);
    expect(select(s, "left", wrong.leftKey, 600)).toBe(s);
    s = advance(s, 700, seeded(2));
    expect(s.resolutions).toHaveLength(0);
    expect(select(s, "left", wrong.leftKey, 700).selected.left).toBe(wrong.leftKey);
    expect(s.left.find((c) => c.key === wrong.leftKey)!.matched).toBe(false);
  });

  it("deals the next normal round 500ms after the last flash ends, not the first", () => {
    let s = deal(config({ rows: 3, pairs: makePairs(5) }), 1, seeded(3));
    s = advance(pickCorrect(s, 0), 500, seeded(3));
    s = pickCorrect(s, 600);
    s = pickCorrect(s, 700); // the last pair, picked during the previous flash
    s = advance(s, 1100, seeded(3));
    expect(s.left.filter((c) => c.matched)).toHaveLength(2);
    expect(s.nextRoundAt).toBeNull();
    s = advance(s, 1200, seeded(3));
    expect(s.left.every((c) => c.matched)).toBe(true);
    expect(s.nextRoundAt).toBe(1200 + TIMINGS.nextRound);
  });

  it("leaves a wrong pick that's flashing alone when endless replaces matched pairs", () => {
    let s = deal(config({ endless: true, rows: 8, pairs: makePairs(12) }), 1, seeded(4));
    s = advance(pickCorrect(s, 0), 500, seeded(4)); // replaced at 5500
    s = pickWrong(s, 5400); // flashes red until 6100
    const wrong = s.resolutions[0];
    s = advance(s, 5500, seeded(4));
    expect(s.left.filter((c) => c.matched)).toHaveLength(0);
    expect(s.left.some((c) => c.key === wrong.leftKey)).toBe(true);
    expect(s.right.some((c) => c.key === wrong.rightKey)).toBe(true);
    expect(isFlashing(s, wrong.leftKey)).toBe(true);
    s = advance(s, 6100, seeded(4));
    expect(isFlashing(s, wrong.leftKey)).toBe(false);
    expectValid(s);
  });

  it("includes pairs picked during other flashes in an endless batch", () => {
    // Five rows (half is 3): picks at 0, 100 and 200 overlap; the third makes half the board matched at 700, so all
    // are replaced at 1200. A fourth pick at 650 ends at 1150 and joins them.
    let s = deal(config({ endless: true, pairs: makePairs(12) }), 1, seeded(5));
    s = pickCorrect(s, 0);
    s = pickCorrect(s, 100);
    s = pickCorrect(s, 200);
    s = advance(s, 650, seeded(5));
    s = pickCorrect(s, 650);
    s = advance(s, 1150, seeded(5));
    expect(s.left.filter((c) => c.matched)).toHaveLength(4);
    expect(s.replaceAt).toBe(1650); // the fourth pick keeps the replacement at least 1s after its click
    s = advance(s, 1650, seeded(5));
    expect(s.left.filter((c) => c.matched)).toHaveLength(0);
    expectValid(s);
  });

  it("relabels at the click, so a pick made during the flash already sees consistent pairs", () => {
    const pairs = pairsFrom([
      ["Cat", "Gato"],
      ["Kitty", "Gato"],
      ["Dog", "Perro"],
    ]);
    for (let seed = 0; seed < 20; seed++) {
      let s = deal(config({ pairs, rows: 3 }), 1, seeded(seed));
      const cat = s.left.find((c) => c.word === "Cat")!;
      const kittysGato = s.right.find((c) => c.word === "Gato" && c.pairId !== cat.pairId)!;
      s = select(select(s, "left", cat.key, 0), "right", kittysGato.key, 0);
      // During that flash, the leftover Kitty + Gato is picked.
      const kitty = s.left.find((c) => c.word === "Kitty")!;
      const otherGato = s.right.find((c) => c.word === "Gato" && c.key !== kittysGato.key)!;
      s = select(select(s, "left", kitty.key, 100), "right", otherGato.key, 100);
      // Both flashing picks are already their own pairs.
      for (const r of s.resolutions) {
        expect(r.correct).toBe(true);
        expect(s.left.find((c) => c.key === r.leftKey)!.pairId).toBe(s.right.find((c) => c.key === r.rightKey)!.pairId);
      }
    }
  });

  it("relabels shared words even when a partner word is flashing red", () => {
    const pairs = pairsFrom([
      ["Cat", "Gato"],
      ["Kitty", "Gato"],
      ["Dog", "Perro"],
    ]);
    for (let seed = 0; seed < 20; seed++) {
      let s = deal(config({ pairs, rows: 3 }), 1, seeded(seed));
      const word = (side: Side, w: string, pairNot?: string) => s[side].find((c) => c.word === w && c.pairId !== pairNot)!;
      // Kitty + Perro is wrong and flashes red; meanwhile Cat + Kitty's Gato is correct by text.
      s = select(select(s, "left", word("left", "Kitty").key, 0), "right", word("right", "Perro").key, 0);
      const cat = word("left", "Cat");
      s = select(select(s, "left", cat.key, 100), "right", word("right", "Gato", cat.pairId).key, 100);
      s = advance(s, 700, seeded(seed));
      // After both flashes, Kitty and the other Gato still form a pair.
      s = select(select(s, "left", word("left", "Kitty").key, 800), "right", s.right.find((c) => c.word === "Gato" && !c.matched)!.key, 800);
      expect(s.resolutions.at(-1)!.correct).toBe(true);
      s = advance(s, 1300, seeded(seed));
      const open = (side: Side) => s[side].filter((c) => !c.matched).map((c) => c.pairId).sort();
      expect(open("right")).toEqual(open("left"));
      expect(canClearBoard(s)).toBe(true);
    }
  });
});
