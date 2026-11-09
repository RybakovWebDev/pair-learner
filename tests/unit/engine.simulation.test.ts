// Randomized games against the engine, over every pair set in tests/fixtures/pairs.ts and every board setting. A
// simulated player clicks around like a real one (right and wrong picks, deselecting, clicking matched words or
// clicking during the flash, toggling fast animations, pausing), and the board rules are checked after every step.
// Seeds are fixed, so a failure names the scenario and seed that reproduce it.
import { describe, expect, it } from "vitest";

import type { Pair } from "@/constants";
import {
  advance,
  deal,
  isCorrectPair,
  isFlashing,
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
import { PAIR_SETS, SHARED_WORD_SETS, UNIQUE_WORD_SETS, type PairSetName } from "../fixtures/pairs";
import { canClearBoard, correctPicks, openCells } from "../fixtures/board-rules";

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

interface Scenario {
  set: PairSetName;
  rows: number;
  endless: boolean;
  mixColumns: boolean;
}

const name = (sc: Scenario) =>
  `${sc.set}, ${sc.rows} rows, ${sc.endless ? "endless" : "normal"}${sc.mixColumns ? ", mixed columns" : ""}`;

/** Every board the Learn screen allows for these sets: 3–8 rows, capped at the pool (pool - 1 in endless mode). */
function scenarios(sets: PairSetName[], endless: boolean): Scenario[] {
  const out: Scenario[] = [];
  for (const set of sets) {
    const pool = PAIR_SETS[set].length;
    const maxRows = Math.min(8, endless ? pool - 1 : pool);
    for (let rows = 3; rows <= maxRows; rows++)
      for (const mixColumns of [false, true]) out.push({ set, rows, endless, mixColumns });
  }
  return out;
}

const speedOf = (s: BoardState) => (s.config.fastAnimations ? "fast" : "normal");

/** Whether two different pairs on the board (matched or not) have a word in common. */
function hasSharedWords(s: BoardState) {
  const byId = new Map(s.config.pairs.map((p) => [p.id, p]));
  const ids = [...new Set([...s.left, ...s.right].map((c) => c.pairId))];
  const seen = new Set<string>();
  for (const id of ids) {
    const p = byId.get(id)!;
    const words = new Set([p.word1, p.word2]);
    for (const w of words) {
      if (seen.has(w)) return true;
    }
    words.forEach((w) => seen.add(w));
  }
  return false;
}

const describeBoard = (s: BoardState) => {
  const cell = (c: Cell) => {
    const res = s.resolutions.find((r) => r.leftKey === c.key || r.rightKey === c.key);
    const state = c.matched ? ", matched" : res ? `, flashing ${res.correct ? "green" : "red"}` : "";
    return `${c.word}(${c.pairId}${state})`;
  };
  return `  left:  ${s.left.map(cell).join("  ")}\n  right: ${s.right.map(cell).join("  ")}`;
};

/** Rules that must hold after every step, whatever the player did. */
function checkBoard(s: BoardState, pool: Pair[], where: string) {
  const fail = (msg: string) => expect.fail(`${where}: ${msg}\n${describeBoard(s)}`);
  const { rows, endless, mixColumns } = s.config;
  const byId = new Map(pool.map((p) => [p.id, p]));

  if (s.left.length !== rows || s.right.length !== rows) fail(`board should have ${rows} rows`);
  const keys = [...s.left, ...s.right].map((c) => c.key);
  if (new Set(keys).size !== keys.length) fail("cell keys must be unique");

  // Every cell shows a word of the pair it was dealt from, word1 on the left unless columns are mixed.
  for (const side of ["left", "right"] as Side[])
    for (const c of s[side]) {
      const pair = byId.get(c.pairId);
      if (!pair) fail(`cell from a pair outside the pool: ${c.pairId}`);
      if (c.word !== pair!.word1 && c.word !== pair!.word2) fail(`"${c.word}" isn't a word of its pair`);
      if (!mixColumns && c.word !== (side === "left" ? pair!.word1 : pair!.word2)) fail(`"${c.word}" is in the wrong column`);
    }
  // No pair is dealt twice onto the board at once.
  const leftIds = s.left.map((c) => c.pairId);
  if (new Set(leftIds).size !== leftIds.length) fail("a pair is on the board twice");

  if (openCells(s, "left").length !== openCells(s, "right").length) fail("columns have different numbers of open words");

  // The selection only points at open cells (not matched, not flashing).
  for (const side of ["left", "right"] as Side[]) {
    const key = s.selected[side];
    if (key && !openCells(s, side).some((c) => c.key === key)) fail(`${side} selection isn't an open cell`);
  }
  // Flashing picks: their cells are on the board and unmatched, and no cell is in two flashes at once.
  const flashingKeys = s.resolutions.flatMap((r) => [r.leftKey, r.rightKey]);
  if (new Set(flashingKeys).size !== flashingKeys.length) fail("a cell is in two flashing picks");
  for (const r of s.resolutions) {
    const l = s.left.find((c) => c.key === r.leftKey);
    const rc = s.right.find((c) => c.key === r.rightKey);
    if (!l || !rc) fail("a flashing pick isn't on the board");
    if (l!.matched || rc!.matched) fail("a flashing cell is already matched");
  }

  if (endless) {
    if (s.nextRoundAt !== null) fail("endless mode never deals a new round");
    if (s.left.some((c) => c.matched) && s.replaceAt === null) fail("matched pairs have no replacement coming");
  } else {
    if (s.replaceAt !== null) fail("normal mode never replaces pairs");
    if (s.left.every((c) => c.matched) && s.nextRoundAt === null) fail("a cleared board has no new round coming");
  }

  // The game can always go on: something is scheduled, or the player has a correct pick.
  if (nextDueAt(s) === null && correctPicks(s).length === 0) fail("stuck: no correct pick and nothing scheduled");
  // Normal mode: when no word on the board is shared between pairs, every word left can still be matched. (With
  // shared words that the pool couldn't avoid, a round can end early instead; the stuck check above covers that.)
  if (!endless && !s.resolutions.length && !hasSharedWords(s) && !canClearBoard(s)) fail("the remaining words can't all be matched");
}

/** Plays one game with a random player. Returns the final state after the board has been left alone for a while. */
function playGame(sc: Scenario, seed: number, steps = 80) {
  const rng = seeded(seed);
  const pool = PAIR_SETS[sc.set];
  const config: BoardConfig = { pairs: pool, rows: sc.rows, endless: sc.endless, mixColumns: sc.mixColumns, fastAnimations: rng() < 0.3 };
  const where = (step: number) => `${name(sc)}, seed ${seed}, step ${step}`;
  let s = deal(config, 1, rng);
  let now = 0;
  checkBoard(s, pool, where(0));

  const any = <T,>(items: T[]) => items[Math.floor(rng() * items.length)];
  let picksThisDeal = 0; // normal mode: correct picks made since the last deal
  let overlaps = 0; // picks made while another pick was still flashing
  for (let step = 1; step <= steps; step++) {
    const roll = rng();
    const before = s;
    // Picks are made whenever the player likes, including while other picks are still flashing.
    if (s.resolutions.length && roll < 0.55) overlaps++;
    if (roll < 0.45) {
      const picks = correctPicks(s);
      if (picks.length) {
        const [l, r] = any(picks);
        const first: Side = rng() < 0.5 ? "left" : "right";
        s = select(s, first, first === "left" ? l.key : r.key, now);
        s = select(s, first === "left" ? "right" : "left", first === "left" ? r.key : l.key, now);
        expect(s.resolutions.length, where(step)).toBe(before.resolutions.length + 1);
        expect(s.resolutions.at(-1)!.correct, where(step)).toBe(true);
        expect(s.resolutions.at(-1)!.endsAt - now, where(step)).toBe(TIMINGS.correct[speedOf(s)]);
        picksThisDeal++;
      }
    } else if (roll < 0.55) {
      const wrong = openCells(s, "left").flatMap((l) =>
        openCells(s, "right").filter((r) => !isCorrectPair(s, l.word, r.word)).map((r) => [l, r] as const),
      );
      if (wrong.length) {
        const [l, r] = any(wrong);
        s = select(select(s, "left", l.key, now), "right", r.key, now);
        expect(s.resolutions.at(-1)!.correct, where(step)).toBe(false);
        expect(s.resolutions.at(-1)!.endsAt - now, where(step)).toBe(TIMINGS.wrong[speedOf(s)]);
      }
    } else if (roll < 0.65) {
      // Select a word, then click it again to deselect.
      const side: Side = rng() < 0.5 ? "left" : "right";
      const open = openCells(s, side);
      if (open.length && !s.selected.left && !s.selected.right) {
        const c = any(open);
        s = select(s, side, c.key, now);
        expect(s.selected[side], where(step)).toBe(c.key);
        s = select(s, side, c.key, now);
        expect(s.selected[side], where(step)).toBeNull();
      }
    } else if (roll < 0.72) {
      // Clicks on matched or flashing words change nothing.
      const side: Side = rng() < 0.5 ? "left" : "right";
      const locked = s[side].filter((c) => c.matched || isFlashing(s, c.key));
      if (locked.length) expect(select(s, side, any(locked).key, now), where(step)).toBe(before);
    } else if (roll < 0.75) {
      s = setFastAnimations(s, !s.config.fastAnimations);
      // Pending timers keep their times.
      expect(nextDueAt(s), where(step)).toBe(nextDueAt(before));
    }

    // Mostly quick (often within a flash), sometimes a long pause.
    const pause = rng();
    now += Math.floor(rng() * (pause < 0.35 ? 200 : pause < 0.9 ? 900 : 7000));
    const prevBoard = s;
    s = advance(s, now, rng);
    checkReplacements(prevBoard, s, where(step));
    checkBoard(s, pool, where(step));
    // Normal mode: once no pick is flashing, every correct pick of this deal is exactly one matched pair.
    if (s.dealId !== prevBoard.dealId) picksThisDeal = 0;
    if (!sc.endless && !s.resolutions.length)
      expect(s.left.filter((c) => c.matched).length, `${where(step)}: matched pairs vs correct picks`).toBe(picksThisDeal);
  }

  // Left alone, endless replaces every matched pair; a cleared normal board gets a new round.
  s = advance(s, now + 10_000, rng);
  checkBoard(s, pool, where(steps + 1));
  if (sc.endless) expect(s.left.some((c) => c.matched), where(steps + 1)).toBe(false);
  return overlaps;
}

/** Plays every scenario and checks the player really did pick during flashes, so overlaps stay covered. */
function playAll(list: Scenario[]) {
  let overlaps = 0;
  for (const sc of list) for (let g = 0; g < GAMES; g++) overlaps += playGame(sc, g);
  expect(overlaps).toBeGreaterThan(list.length);
}

/** New cells only replace matched ones (endless) or come with a new deal, and never repeat a pair still on screen. */
function checkReplacements(before: BoardState, after: BoardState, where: string) {
  if (after.dealId !== before.dealId) return;
  const oldKeys = new Set([...before.left, ...before.right].map((c) => c.key));
  // Correct picks still flashing can finish and be replaced within the same step.
  const flashingCorrect = new Set(before.resolutions.filter((r) => r.correct).flatMap((r) => [r.leftKey, r.rightKey]));
  const leaving = (c: Cell) => c.matched || flashingCorrect.has(c.key);
  // Pair ids of words that stayed, as they are now (a cross-pair match relabels the leftover cells).
  const stayedIds = new Set(after.left.filter((c) => oldKeys.has(c.key) && !c.matched).map((c) => c.pairId));
  for (const side of ["left", "right"] as Side[])
    after[side].forEach((c, i) => {
      if (oldKeys.has(c.key)) return;
      expect(before.config.endless, `${where}: a cell changed mid-round in normal mode`).toBe(true);
      // Unmatched words only leave as stranded words (the last-resort fallback), which needs shared words.
      if (!hasSharedWords(before)) expect(leaving(before[side][i]), `${where}: replaced a word that wasn't matched`).toBe(true);
      expect(stayedIds.has(c.pairId), `${where}: dealt a pair that's still on screen`).toBe(false);
    });
}

const GAMES = 6;

describe("random games, every word unique", () => {
  for (const endless of [false, true])
    it(`${endless ? "endless" : "normal"} mode, every row count and column setting`, () => {
      playAll(scenarios(UNIQUE_WORD_SETS, endless));
    });
});

// Regression tests for bug 1 (fixed 2026-11-09): matching is by word text, so a pick could pair cells dealt from
// different pairs. Normal mode could then strand a word (the round never ended), and endless mode could run short of
// pairs to deal and show the same pair twice.
describe("random games, words shared between pairs", () => {
  it("endless mode, every row count and column setting", () => {
    playAll(scenarios(SHARED_WORD_SETS, true));
  });

  it("normal mode, every row count and column setting", () => {
    playAll(scenarios(SHARED_WORD_SETS, false));
  });
});

describe("normal rounds", () => {
  it("deals a new round exactly 500ms after the last match, for every set and size", () => {
    for (const sc of scenarios([...UNIQUE_WORD_SETS, ...SHARED_WORD_SETS], false)) {
      const rng = seeded(sc.rows);
      let s = deal({ pairs: PAIR_SETS[sc.set], rows: sc.rows, endless: false, mixColumns: sc.mixColumns, fastAnimations: false }, 1, rng);
      let now = 0;
      // A careful player: only picks that leave the rest of the board matchable (shared words can strand a word).
      for (;;) {
        const next = correctPicks(s)
          .map(([l, r]) => advance(select(select(s, "left", l.key, now), "right", r.key, now), now + TIMINGS.correct.normal, rng))
          .find((n) => canClearBoard(n) || n.left.every((c) => c.matched));
        if (!next) break;
        s = next;
        now += TIMINGS.correct.normal;
      }
      expect(s.left.every((c) => c.matched), name(sc)).toBe(true);
      expect(s.nextRoundAt, name(sc)).toBe(now + TIMINGS.nextRound);
      expect(advance(s, now + TIMINGS.nextRound - 1, rng).dealId).toBe(1);
      expect(advance(s, now + TIMINGS.nextRound, rng).dealId, name(sc)).toBe(2);
    }
  });
});
