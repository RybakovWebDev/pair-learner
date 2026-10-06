import { describe, expect, it, vi } from "vitest";

// Game.tsx creates the browser Supabase client at import time; the reducer doesn't need it.
vi.mock("@/utils/supabase/client", () => ({ supabase: {} }));

import { gameReducer as columnsReducer } from "@/hooks/useGameState";
import { gameReducer as gameScreenReducer } from "@/components/Game/Game";
import type { WordState } from "@/components/PairListColumns";

type ColumnsState = Parameters<typeof columnsReducer>[0];
type GameScreenState = Parameters<typeof gameScreenReducer>[0];

const word = (id: string, text: string): WordState => ({ id, word: text, isMatched: false, isAnimating: false });

const columnsState = (): ColumnsState => ({
  leftColumn: [word("p0", "Cat"), word("p1", "Dog")],
  rightColumn: [word("p1", "Perro"), word("p0", "Gato")],
  selectedPairs: [],
  isAnyIncorrectAnimating: false,
  isAnyCorrectAnimating: false,
  isLoading: false,
  initialOpacity: 1,
  listKey: 0,
});

const select = (state: ColumnsState, column: "left" | "right", id: string, text: string) =>
  columnsReducer(state, { type: "SELECT_WORD", payload: { word: text, id, column } });

describe("columns reducer (useGameState)", () => {
  it("starts a selection, and deselects when the same word is clicked again", () => {
    const s1 = select(columnsState(), "left", "p0", "Cat");
    expect(s1.selectedPairs).toEqual([{ left: "Cat", right: "", leftId: "p0", rightId: "", matchResult: null }]);
    const s2 = select(s1, "left", "p0", "Cat");
    expect(s2.selectedPairs).toEqual([]);
  });

  it("replaces the selection when another word in the same column is clicked", () => {
    const s = select(select(columnsState(), "left", "p0", "Cat"), "left", "p1", "Dog");
    expect(s.selectedPairs).toEqual([{ left: "Dog", right: "", leftId: "p1", rightId: "", matchResult: null }]);
  });

  it("completes a pair when a word in the other column is clicked", () => {
    const s = select(select(columnsState(), "right", "p0", "Gato"), "left", "p0", "Cat");
    expect(s.selectedPairs).toEqual([{ left: "Cat", right: "Gato", leftId: "p0", rightId: "p0", matchResult: null }]);
  });

  it("marks a processed match and animates both cells", () => {
    const pair = { left: "Cat", right: "Gato", leftId: "p0", rightId: "p0", matchResult: null };
    const base = { ...columnsState(), selectedPairs: [pair] };

    const correct = columnsReducer(base, { type: "PROCESS_MATCH", payload: { pair, isMatch: true } });
    expect(correct.selectedPairs[0].matchResult).toBe("correct");
    expect(correct.isAnyCorrectAnimating).toBe(true);
    expect(correct.isAnyIncorrectAnimating).toBe(false);
    expect(correct.leftColumn.find((w) => w.id === "p0")!.isAnimating).toBe(true);
    expect(correct.rightColumn.find((w) => w.id === "p0")!.isAnimating).toBe(true);
    expect(correct.leftColumn.find((w) => w.id === "p1")!.isAnimating).toBe(false);

    const wrong = columnsReducer(base, { type: "PROCESS_MATCH", payload: { pair, isMatch: false } });
    expect(wrong.selectedPairs[0].matchResult).toBe("incorrect");
    expect(wrong.isAnyIncorrectAnimating).toBe(true);
  });

  it("clears animation flags when the animation finishes", () => {
    const pair = { left: "Cat", right: "Gato", leftId: "p0", rightId: "p0", matchResult: null };
    const animating = columnsReducer(
      { ...columnsState(), selectedPairs: [pair] },
      { type: "PROCESS_MATCH", payload: { pair, isMatch: true } },
    );
    const done = columnsReducer(animating, { type: "FINISH_ANIMATION", payload: { ids: ["p0"] } });
    expect([...done.leftColumn, ...done.rightColumn].every((w) => !w.isAnimating)).toBe(true);
    expect(done.isAnyCorrectAnimating).toBe(false);
  });

  it("empties the board and bumps the list key when a round completes", () => {
    const s = columnsReducer(select(columnsState(), "left", "p0", "Cat"), { type: "COMPLETE_ROUND" });
    expect(s.leftColumn).toEqual([]);
    expect(s.rightColumn).toEqual([]);
    expect(s.selectedPairs).toEqual([]);
    expect(s.listKey).toBe(1);
  });

  it("clears selections but keeps the board on reset", () => {
    const before = select(columnsState(), "left", "p0", "Cat");
    const s = columnsReducer(before, { type: "RESET_GAME" });
    expect(s.selectedPairs).toEqual([]);
    expect(s.leftColumn).toBe(before.leftColumn);
  });
});

const screenState = (): GameScreenState => ({
  isLoading: true,
  pairs: [],
  tags: [],
  rowCount: 5,
  tagsOpen: false,
  enabledTags: [],
  roundLength: 210,
  isGameRunning: false,
  timeRemaining: 210,
  refreshTrigger: 0,
  solvedPairs: 0,
  mistakePairs: 0,
});

describe("game screen reducer (Game.tsx)", () => {
  it("stops loading once data arrives", () => {
    const s = gameScreenReducer(screenState(), { type: "INITIALIZE_DATA", payload: { pairs: [{ id: "x" }], tags: [] } });
    expect(s.isLoading).toBe(false);
    expect(s.pairs).toHaveLength(1);
  });

  it("resets the timer when the round length changes", () => {
    const s = gameScreenReducer(screenState(), { type: "SET_ROUND_LENGTH", payload: 60 });
    expect(s).toMatchObject({ roundLength: 60, timeRemaining: 60 });
  });

  it("restarts the timer on start, and keeps the remaining time on stop", () => {
    const running = gameScreenReducer(
      { ...screenState(), roundLength: 60, timeRemaining: 12 },
      { type: "SET_GAME_RUNNING", payload: true },
    );
    expect(running).toMatchObject({ isGameRunning: true, timeRemaining: 60 });
    const stopped = gameScreenReducer({ ...running, timeRemaining: 30 }, { type: "SET_GAME_RUNNING", payload: false });
    expect(stopped).toMatchObject({ isGameRunning: false, timeRemaining: 30 });
  });

  it("counts and resets matches and mistakes", () => {
    let s = screenState();
    s = gameScreenReducer(s, { type: "INCREMENT_SOLVED_PAIRS" });
    s = gameScreenReducer(s, { type: "INCREMENT_SOLVED_PAIRS" });
    s = gameScreenReducer(s, { type: "INCREMENT_MISTAKE_PAIRS" });
    expect(s).toMatchObject({ solvedPairs: 2, mistakePairs: 1 });
    s = gameScreenReducer(s, { type: "RESET_SOLVED_PAIRS" });
    s = gameScreenReducer(s, { type: "RESET_MISTAKE_PAIRS" });
    expect(s).toMatchObject({ solvedPairs: 0, mistakePairs: 0 });
  });

  it("ignores unknown actions", () => {
    const s = screenState();
    expect(gameScreenReducer(s, { type: "SET_NOT_ENOUGH_PAIRS", payload: true })).toBe(s);
  });
});
