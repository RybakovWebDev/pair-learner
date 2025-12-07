"use client";
import { useEffect, useCallback, useRef, useMemo } from "react";
import { LazyMotion, m, AnimatePresence } from "framer-motion";

import styles from "./PairList.module.css";

import PairListStatic from "../PairListStatic";
import Spinner from "../Spinner";
import PairListColumns from "../PairListColumns";

import { Pair } from "@/constants";
import { AnimateChangeInHeight } from "@/utils/helpers";
import { useGameState } from "@/hooks/useGameState";
import { useMatchProcessing } from "@/hooks/useMatchProcessing";
import { getRandomUniquePairs, initializePairListColumns } from "@/utils/gameUtils";

const loadFeatures = () => import("../../features").then((res) => res.default);

interface PairListProps {
  numPairs?: number;
  isGameRunning: boolean;
  refreshTrigger?: number;
  emojis?: boolean;
  showSparkles?: boolean;
  endlessMode: boolean;
  mixColumns?: boolean;
  fastAnimations?: boolean;
  pairs: Pair[];
  onPairSolved?: () => void;
  onPairMistake?: () => void;
}

function PairList({
  numPairs = 5,
  isGameRunning,
  refreshTrigger,
  emojis,
  showSparkles = true,
  endlessMode,
  mixColumns = false,
  fastAnimations = false,
  pairs,
  onPairSolved,
  onPairMistake,
}: PairListProps) {
  const { state, dispatch } = useGameState();
  const currentRoundPairs = useRef<Pair[]>([]);
  const initializeColumnsRef = useRef<(() => void) | null>(null);

  const initializeColumns = useCallback(() => {
    if (pairs.length < numPairs) {
      console.error("Not enough pairs available");
      dispatch({ type: "INITIALIZE_COLUMNS", payload: { left: [], right: [] } });
      return;
    }

    const selectedPairs = getRandomUniquePairs(pairs, numPairs);
    currentRoundPairs.current = selectedPairs;

    const { left, right } = initializePairListColumns(selectedPairs, mixColumns);

    dispatch({
      type: "INITIALIZE_COLUMNS",
      payload: { left, right },
    });
    dispatch({ type: "INCREMENT_LIST_KEY" });
  }, [numPairs, pairs, mixColumns, dispatch]);

  initializeColumnsRef.current = initializeColumns;

  const { processMatch } = useMatchProcessing({
    state,
    dispatch,
    currentRoundPairs,
    endlessMode,
    mixColumns,
    fastAnimations,
    pairs,
    onPairSolved,
    onPairMistake,
    initializeColumns: () => initializeColumnsRef.current?.(),
  });

  useEffect(() => {
    const timer = setTimeout(() => dispatch({ type: "SET_INITIAL_OPACITY", payload: 0 }), 2000);
    return () => clearTimeout(timer);
  }, [dispatch]);

  useEffect(() => {
    dispatch({ type: "SET_LOADING", payload: true });
    if (pairs.length >= numPairs) {
      initializeColumns();
    } else {
      dispatch({ type: "INITIALIZE_COLUMNS", payload: { left: [], right: [] } });
    }
    dispatch({ type: "SET_LOADING", payload: false });
  }, [pairs, initializeColumns, refreshTrigger, numPairs, dispatch]);

  useEffect(() => {
    dispatch({ type: "CHANGE_MODE", payload: endlessMode });
    initializeColumns();
  }, [endlessMode, initializeColumns, dispatch]);

  useEffect(() => {
    if (!isGameRunning) {
      dispatch({ type: "RESET_GAME" });
    }
  }, [isGameRunning, dispatch]);

  const handleSelectWord = useCallback(
    (word: string, id: string, column: "left" | "right") => {
      if (!isGameRunning || state.isAnyIncorrectAnimating || state.isAnyCorrectAnimating) return;

      const wordState = (column === "left" ? state.leftColumn : state.rightColumn).find((w) => w.id === id);
      if (wordState?.isMatched) return;

      dispatch({ type: "SELECT_WORD", payload: { word, id, column } });
    },
    [
      isGameRunning,
      state.leftColumn,
      state.rightColumn,
      state.isAnyIncorrectAnimating,
      state.isAnyCorrectAnimating,
      dispatch,
    ]
  );

  useEffect(() => {
    const completePairs = state.selectedPairs.filter((pair) => pair.left && pair.right && pair.matchResult === null);

    if (completePairs.length > 0) {
      completePairs.forEach((pair) => processMatch(pair));
    }
  }, [state.selectedPairs, processMatch]);

  const memoizedLeftColumn = useMemo(() => state.leftColumn, [state.leftColumn]);
  const memoizedRightColumn = useMemo(() => state.rightColumn, [state.rightColumn]);

  if (state.isLoading && !emojis) {
    return <Spinner margin='5vh 0 0 0' />;
  }

  const shouldRenderColumns =
    emojis || (memoizedLeftColumn.length >= numPairs && memoizedRightColumn.length >= numPairs);

  return (
    <LazyMotion features={loadFeatures}>
      <AnimateChangeInHeight className={styles.ulWrapper} enterDuration={0.2} exitDuration={0.2}>
        <AnimatePresence mode='wait'>
          {state.isLoading && emojis ? (
            <PairListStatic key='static-list' />
          ) : shouldRenderColumns ? (
            <PairListColumns
              key={state.listKey}
              leftColumn={memoizedLeftColumn}
              rightColumn={memoizedRightColumn}
              selectedPairs={state.selectedPairs}
              isAnyIncorrectAnimating={state.isAnyIncorrectAnimating}
              isAnyCorrectAnimating={state.isAnyCorrectAnimating}
              isGameRunning={isGameRunning}
              initialOpacity={state.initialOpacity}
              showSparkles={showSparkles}
              emojis={emojis}
              onSelectWord={handleSelectWord}
            />
          ) : (
            <m.div key='no-pairs' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p>Not enough pairs available. Please add more pairs or adjust your settings.</p>
            </m.div>
          )}
        </AnimatePresence>
      </AnimateChangeInHeight>
    </LazyMotion>
  );
}

export default PairList;
