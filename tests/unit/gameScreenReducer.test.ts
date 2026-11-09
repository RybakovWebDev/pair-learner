import { describe, expect, it, vi } from "vitest";

// Game.tsx creates the browser Supabase client at import time; the reducer doesn't need it.
vi.mock("@/utils/supabase/client", () => ({ supabase: {} }));

import { gameReducer as gameScreenReducer } from "@/components/Game/Game";

type GameScreenState = Parameters<typeof gameScreenReducer>[0];

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

  it("starts every game with zeroed counters, however the last one ended", () => {
    // A timed round that runs out stops the game without the Stop button's reset.
    const ended = { ...screenState(), solvedPairs: 4, mistakePairs: 2, isGameRunning: false };
    const s = gameScreenReducer(ended, { type: "SET_GAME_RUNNING", payload: true });
    expect(s).toMatchObject({ isGameRunning: true, solvedPairs: 0, mistakePairs: 0 });
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
