// The matching game as pure functions: no React, no timers. Time (`now`, in ms) and randomness (`rng`) are passed in,
// so every rule can be tested exactly. React wiring lives in hooks/useGameBoard.ts.
//
// Rules in short:
// - A board has `rows` slots per column. Each pair on the board shows one word in each column.
// - Pick one word per column; the pair is checked by word text against the pairs on the board.
// - A correct or wrong pick "resolves" for a moment (the flash). Only the two flashing words are locked meanwhile; the
//   player can go on picking other words, so several picks can flash at once. Each one finishes on its own time.
// - Normal mode: correct pairs stay on the board as matched; when all are matched, a new round is dealt.
// - Endless mode (like Duolingo's Match Madness): a correct pair stays on the board as matched while it fades out.
//   All matched pairs are replaced together: 5s after the first one's flash ends, or 1s after the match that makes half
//   the board (rounded up) matched. A pair matched while others are fading joins them, and always gets at least the
//   short fade a batch gets. Replacements go into the freed slots in random order, so a pair rarely comes back where
//   it was. Pairs on screen are never dealt, and leaving pairs only when nothing else is left.
//
// Shared words (synonyms, duplicates), because matching is by text:
// 1. Deals and replacements avoid putting two pairs that share a word on the board together, whenever the pool has
//    enough other pairs. Then every word on screen is unique and a correct pick is always the cells' own pair.
// 2. When that can't be avoided and a pick pairs cells dealt from different pairs, the leftover cells are relabelled
//    (nothing changes on screen) so every open word still belongs to a pair with a partner on the board.
// 3. If even that leaves words that can't be matched, the board is never stuck: normal mode deals the next round, and
//    endless mode lets the stranded words fade out with the matched ones and replaces them.

import type { Pair } from "@/constants";

export type Rng = () => number;
export type Side = "left" | "right";

export interface Cell {
  key: string; // unique per dealt cell, stable while it stays on the board
  pairId: string;
  word: string;
  matched: boolean;
}

export interface BoardConfig {
  pairs: Pair[];
  rows: number;
  mixColumns: boolean;
  endless: boolean;
  fastAnimations: boolean;
}

export interface Resolution {
  leftKey: string;
  rightKey: string;
  correct: boolean;
  startedAt: number;
  endsAt: number;
}

export interface BoardState {
  config: BoardConfig;
  dealId: number;
  left: Cell[];
  right: Cell[];
  selected: Record<Side, string | null>;
  /** Picks that are flashing right now, oldest first. Their cells are locked until each one finishes. */
  resolutions: Resolution[];
  /** Endless mode: when all matched cells are replaced together, or null when none are matched. */
  replaceAt: number | null;
  nextRoundAt: number | null;
  keySeq: number;
}

export const TIMINGS = {
  correct: { normal: 500, fast: 250 },
  wrong: { normal: 700, fast: 400 },
  nextRound: 500,
  /** Endless mode: matched pairs are replaced this long after the match that makes half the board matched. This is
   * also the soonest they can be replaced after any match, so every pair gets at least this fade-out. */
  refill: { normal: 1000, fast: 600 },
  /** Endless mode: otherwise matched pairs are replaced this long after the first one's flash ends. */
  refillIdle: 5000,
} as const;

const speed = (config: BoardConfig) => (config.fastAnimations ? "fast" : "normal");

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}


/** Deals a fresh board. With fewer pairs than rows the board is empty (the UI shows a "not enough pairs" message). */
export function deal(config: BoardConfig, dealId: number, rng: Rng): BoardState {
  const state: BoardState = {
    config,
    dealId,
    left: [],
    right: [],
    selected: { left: null, right: null },
    resolutions: [],
    replaceAt: null,
    nextRoundAt: null,
    keySeq: 0,
  };
  if (config.pairs.length < config.rows || config.rows <= 0) return state;

  const chosen = pickPairs(config.pairs, config.rows, new Set(), new Set(), rng);
  const lefts: Cell[] = [];
  const rights: Cell[] = [];
  for (const pair of chosen) {
    const [l, r] = orient(pair, config, rng);
    lefts.push(newCell(state, pair.id, l));
    rights.push(newCell(state, pair.id, r));
  }
  state.left = shuffle(lefts, rng);
  state.right = shuffle(rights, rng);
  return state;
}

const wordsOf = (p: Pair) => [p.word1, p.word2];

/**
 * Picks `count` pairs in random order, preferring, in this order: pairs whose words aren't in `taken` or in an earlier
 * pick (so no word shows twice), then pairs not in `avoidIds`. Falls back to the rest when the pool runs short.
 */
function pickPairs(pool: Pair[], count: number, taken: Set<string>, avoidIds: Set<string>, rng: Rng): Pair[] {
  const words = new Set(taken);
  const chosen: Pair[] = [];
  const candidates = shuffle(pool, rng);
  const tiers: ((p: Pair) => boolean)[] = [
    (p) => !avoidIds.has(p.id) && !wordsOf(p).some((w) => words.has(w)),
    (p) => !wordsOf(p).some((w) => words.has(w)),
    (p) => !avoidIds.has(p.id),
    () => true,
  ];
  for (const fits of tiers)
    for (const p of candidates) {
      if (chosen.length === count) return chosen;
      if (chosen.includes(p) || !fits(p)) continue;
      chosen.push(p);
      wordsOf(p).forEach((w) => words.add(w));
    }
  return chosen;
}

function orient(pair: Pair, config: BoardConfig, rng: Rng): [string, string] {
  const swap = config.mixColumns && rng() < 0.5;
  return swap ? [pair.word2, pair.word1] : [pair.word1, pair.word2];
}

function newCell(state: BoardState, pairId: string, word: string): Cell {
  state.keySeq += 1;
  return { key: `${state.dealId}-${state.keySeq}`, pairId, word, matched: false };
}

const cellsOf = (state: BoardState) => [...state.left, ...state.right];

export function findCell(state: BoardState, side: Side, key: string): Cell | undefined {
  return state[side].find((c) => c.key === key);
}

/** Whether a cell is part of a pick that's flashing. */
export function isFlashing(state: BoardState, key: string): boolean {
  return state.resolutions.some((r) => r.leftKey === key || r.rightKey === key);
}

/** A cell the player can pick: not matched, and not flashing. */
const isOpen = (state: BoardState, c: Cell) => !c.matched && !isFlashing(state, c.key);

/** Endless mode: when a matched cell leaves the board (it fades out until then), or null if it isn't leaving. */
export function leavesAt(state: BoardState, cell: Cell): number | null {
  return state.config.endless && cell.matched ? state.replaceAt : null;
}

/** The pairs currently on the board (including matched ones). */
export function boardPairs(state: BoardState): Pair[] {
  const ids = new Set(cellsOf(state).map((c) => c.pairId));
  return state.config.pairs.filter((p) => ids.has(p.id));
}

/** Matching is by word text: any pair on the board with these two words counts. */
export function isCorrectPair(state: BoardState, a: string, b: string): boolean {
  return boardPairs(state).some((p) => (p.word1 === a && p.word2 === b) || (p.word1 === b && p.word2 === a));
}

/** A click on a word. Ignored on matched, flashing or missing cells. */
export function select(state: BoardState, side: Side, key: string, now: number): BoardState {
  const cell = findCell(state, side, key);
  if (!cell || !isOpen(state, cell)) return state;

  const selected = { ...state.selected, [side]: state.selected[side] === key ? null : key };
  if (!selected.left || !selected.right) return { ...state, selected };

  const left = findCell(state, "left", selected.left)!;
  const right = findCell(state, "right", selected.right)!;
  const correct = isCorrectPair(state, left.word, right.word);
  const duration = TIMINGS[correct ? "correct" : "wrong"][speed(state.config)];
  // A pair matched just as the others finish fading joins them, so they're replaced together.
  const replaceAt =
    correct && state.replaceAt !== null ? Math.max(state.replaceAt, now + TIMINGS.refill[speed(state.config)]) : state.replaceAt;
  // Relabel right away (not when the flash ends), so picks made during the flash see consistent pairs.
  const base = correct ? relabel(state, left, right) : state;
  return {
    ...base,
    replaceAt,
    selected: { left: null, right: null },
    resolutions: [
      ...state.resolutions,
      { leftKey: left.key, rightKey: right.key, correct, startedAt: now, endsAt: now + duration },
    ],
  };
}

/** The next time something is scheduled to happen, or null if the board is idle. */
export function nextDueAt(state: BoardState): number | null {
  const times = [
    ...state.resolutions.map((r) => r.endsAt),
    state.nextRoundAt ?? undefined,
    state.replaceAt ?? undefined,
  ].filter((t): t is number => t !== undefined);
  return times.length ? Math.min(...times) : null;
}

/** Applies everything that's due by `now`, in time order. */
export function advance(state: BoardState, now: number, rng: Rng): BoardState {
  let s = state;
  for (;;) {
    const due = nextDueAt(s);
    if (due === null || due > now) return s;
    const finishing = s.resolutions.find((r) => r.endsAt === due);
    if (finishing) s = finishResolution(s, finishing);
    else if (s.replaceAt === due) s = replaceMatched(s, due, rng);
    else s = deal(s.config, s.dealId + 1, rng); // next round
  }
}

function finishResolution(state: BoardState, res: Resolution): BoardState {
  const resolutions = state.resolutions.filter((r) => r !== res);
  if (!res.correct) return unstick({ ...state, resolutions }, res.endsAt);

  const markMatched = (c: Cell) => (c.key === res.leftKey || c.key === res.rightKey ? { ...c, matched: true } : c);
  const next = { ...state, resolutions, left: state.left.map(markMatched), right: state.right.map(markMatched) };

  if (state.config.endless) {
    const soonest = res.startedAt + TIMINGS.refill[speed(state.config)];
    const halfMatched = next.left.filter((c) => c.matched).length >= Math.ceil(state.config.rows / 2);
    next.replaceAt = halfMatched ? soonest : Math.max(state.replaceAt ?? res.endsAt + TIMINGS.refillIdle, soonest);
    return unstick(next, res.startedAt);
  }

  const allMatched = cellsOf(next).every((c) => c.matched);
  return allMatched ? { ...next, nextRoundAt: res.endsAt + TIMINGS.nextRound } : unstick(next, res.endsAt);
}

/** Whether the player has any correct pick among the open words (not matched, not flashing). */
export function hasCorrectPick(state: BoardState): boolean {
  const openRight = state.right.filter((c) => isOpen(state, c));
  return state.left.some((l) => isOpen(state, l) && openRight.some((r) => isCorrectPair(state, l.word, r.word)));
}

/**
 * After a correct pick of cells dealt from different pairs (`left` from pair a, `right` from pair b), gives cells new
 * pair ids so the picked cells share one pair and every other open cell still has its partner. Words don't change, and
 * every cell keeps showing a word of its pair. Cases the swaps can't cover are left to `unstick`.
 */
function relabel(state: BoardState, left: Cell, right: Cell): BoardState {
  const a = left.pairId;
  const b = right.pairId;
  if (a === b) return state;
  // Cells still in play: not matched and not in a correct pick. (Cells flashing red come back, so they count.)
  const takenKeys = new Set(state.resolutions.filter((r) => r.correct).flatMap((r) => [r.leftKey, r.rightKey]));
  const open = (side: Side) =>
    state[side].filter((c) => !c.matched && !takenKeys.has(c.key) && c.key !== left.key && c.key !== right.key);
  const leftOfB = open("left").find((c) => c.pairId === b);
  const rightOfA = open("right").find((c) => c.pairId === a);

  const ids = new Map<string, string>(); // cell key -> new pair id
  if (rightOfA && rightOfA.word === right.word) {
    // Both right cells show the same word: swap them.
    ids.set(right.key, a).set(rightOfA.key, b);
  } else if (leftOfB && leftOfB.word === left.word) {
    // Both left cells show the same word: swap them.
    ids.set(left.key, b).set(leftOfB.key, a);
  } else {
    // A third open pair c shows the same two words: the picked cells become c, and c's cells take over a and b.
    const leftOfC = open("left").find((l) => l.word === left.word && open("right").some((r) => r.pairId === l.pairId && r.word === right.word));
    if (!leftOfC) return state;
    const rightOfC = open("right").find((r) => r.pairId === leftOfC.pairId)!;
    ids.set(left.key, leftOfC.pairId).set(right.key, leftOfC.pairId).set(leftOfC.key, a).set(rightOfC.key, b);
  }
  const apply = (c: Cell) => (ids.has(c.key) ? { ...c, pairId: ids.get(c.key)! } : c);
  return { ...state, left: state.left.map(apply), right: state.right.map(apply) };
}

/**
 * The last resort when shared words leave open words that can't be matched: normal mode deals the next round; endless
 * mode lets the stranded words leave with the matched ones (they fade out and are replaced).
 */
function unstick(state: BoardState, now: number): BoardState {
  // Wait for every flash to finish: words in a wrong pick come back and may still be matchable.
  if (state.resolutions.length || hasCorrectPick(state) || cellsOf(state).every((c) => c.matched)) return state;
  if (state.nextRoundAt !== null) return state;
  if (!state.config.endless) return { ...state, nextRoundAt: now + TIMINGS.nextRound };
  const leave = (c: Cell) => (c.matched ? c : { ...c, matched: true });
  return {
    ...state,
    selected: { left: null, right: null },
    left: state.left.map(leave),
    right: state.right.map(leave),
    replaceAt: Math.max(state.replaceAt ?? 0, now + TIMINGS.refill[speed(state.config)]),
  };
}

/** Endless mode: replaces every matched pair with a new pair, in random slots among the freed ones. */
function replaceMatched(state: BoardState, now: number, rng: Rng): BoardState {
  const leftSlots = shuffle(state.left.flatMap((c, i) => (c.matched ? [i] : [])), rng);
  const rightSlots = shuffle(state.right.flatMap((c, i) => (c.matched ? [i] : [])), rng);
  const leavingIds = new Set(state.left.filter((c) => c.matched).map((c) => c.pairId));

  const staying = cellsOf(state).filter((c) => !c.matched);
  const stayingIds = new Set(staying.map((c) => c.pairId));
  // Never a pair that stays on screen; prefer pairs with no word on screen, then pairs that aren't the ones leaving.
  const pool = state.config.pairs.filter((p) => !stayingIds.has(p.id));
  const candidates = pickPairs(pool, leftSlots.length, new Set(staying.map((c) => c.word)), leavingIds, rng);

  const next: BoardState = { ...state, replaceAt: null, left: [...state.left], right: [...state.right] };
  // Left and right slots are shuffled separately, so a pair's two words don't land in matching rows.
  leftSlots.forEach((slot, i) => {
    const pair = candidates[i];
    if (!pair) {
      // Only with fewer pairs than rows, which the Learn screen doesn't allow: keep the leftovers a while longer.
      next.replaceAt = now + TIMINGS.refillIdle;
      return;
    }
    const [l, r] = orient(pair, state.config, rng);
    next.left[slot] = newCell(next, pair.id, l);
    next.right[rightSlots[i]] = newCell(next, pair.id, r);
  });
  return unstick(next, now);
}

/** Changes animation speed without re-dealing. Already-running timers keep their times. */
export function setFastAnimations(state: BoardState, fastAnimations: boolean): BoardState {
  return state.config.fastAnimations === fastAnimations ? state : { ...state, config: { ...state.config, fastAnimations } };
}
