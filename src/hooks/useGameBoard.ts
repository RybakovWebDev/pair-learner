import { useCallback, useEffect, useReducer, useRef } from "react";

import type { Pair } from "@/constants";
import * as engine from "@/game/engine";
import type { BoardState, Side } from "@/game/engine";

interface UseGameBoardOptions {
  pairs: Pair[];
  numPairs: number;
  isGameRunning: boolean;
  endlessMode: boolean;
  mixColumns: boolean;
  fastAnimations: boolean;
  refreshTrigger?: number;
  onPairSolved?: () => void;
  onPairMistake?: () => void;
}

type Action =
  | { type: "deal"; config: engine.BoardConfig }
  | { type: "select"; side: Side; key: string; now: number }
  | { type: "advance"; now: number }
  | { type: "setFastAnimations"; fast: boolean };

// Randomness comes from Math.random, as it always has. The engine takes it as a parameter so tests can control it.
function reducer(state: BoardState | null, action: Action): BoardState | null {
  if (action.type === "deal") return engine.deal(action.config, (state?.dealId ?? 0) + 1, Math.random);
  if (!state) return state;
  switch (action.type) {
    case "select":
      return engine.select(state, action.side, action.key, action.now);
    case "advance":
      return engine.advance(state, action.now, Math.random);
    case "setFastAnimations":
      return engine.setFastAnimations(state, action.fast);
  }
}

/** The game board's state and timing. Returns null until the first deal. */
export function useGameBoard({
  pairs,
  numPairs,
  isGameRunning,
  endlessMode,
  mixColumns,
  fastAnimations,
  refreshTrigger,
  onPairSolved,
  onPairMistake,
}: UseGameBoardOptions) {
  const [state, dispatch] = useReducer(reducer, null);

  // Latest animation speed for new deals, without re-dealing when only the speed changes.
  const fastRef = useRef(fastAnimations);

  // Deal a fresh board whenever the pairs or the board settings change, or on Refresh.
  useEffect(() => {
    dispatch({
      type: "deal",
      config: { pairs, rows: numPairs, mixColumns, endless: endlessMode, fastAnimations: fastRef.current },
    });
  }, [pairs, numPairs, mixColumns, endlessMode, refreshTrigger]);

  // Stopping the game deals a fresh board for the next one.
  const wasRunning = useRef(isGameRunning);
  useEffect(() => {
    if (wasRunning.current && !isGameRunning) {
      dispatch({
        type: "deal",
        config: { pairs, rows: numPairs, mixColumns, endless: endlessMode, fastAnimations: fastRef.current },
      });
    }
    wasRunning.current = isGameRunning;
  }, [isGameRunning, pairs, numPairs, mixColumns, endlessMode]);

  useEffect(() => {
    fastRef.current = fastAnimations;
    dispatch({ type: "setFastAnimations", fast: fastAnimations });
  }, [fastAnimations]);

  // One timer for whatever happens next (end of a flash, a refill, the next round).
  const due = state ? engine.nextDueAt(state) : null;
  useEffect(() => {
    if (due === null) return;
    // Treat `due` as reached when the timer fires, even if the clock reads a millisecond early; otherwise nothing would
    // change, `due` would stay the same and the timer would never be set again.
    const timer = setTimeout(
      () => dispatch({ type: "advance", now: Math.max(Date.now(), due) }),
      Math.max(0, due - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [due]);

  // Report each pick once, as soon as it starts resolving.
  const callbacks = useRef({ onPairSolved, onPairMistake });
  useEffect(() => {
    callbacks.current = { onPairSolved, onPairMistake };
  }, [onPairSolved, onPairMistake]);
  // Several picks can flash at once, so remember every one already reported (each pick is its own object).
  const reported = useRef(new WeakSet<engine.Resolution>());
  const resolutions = state?.resolutions;
  useEffect(() => {
    for (const res of resolutions ?? []) {
      if (reported.current.has(res)) continue;
      reported.current.add(res);
      if (res.correct) callbacks.current.onPairSolved?.();
      else callbacks.current.onPairMistake?.();
    }
  }, [resolutions]);

  const selectWord = useCallback(
    (side: Side, key: string) => {
      if (!isGameRunning) return;
      dispatch({ type: "select", side, key, now: Date.now() });
    },
    [isGameRunning],
  );

  return { state, selectWord };
}
