"use client";
import { useEffect, useMemo, useState } from "react";
import { LazyMotion, m } from "framer-motion";

import styles from "./PairList.module.css";

import Spinner from "../Spinner";
import PairListColumns, { type SlotView } from "../PairListColumns";
import FadeOutSwap from "../FadeOutSwap";

import { Pair } from "@/constants";
import { AnimateChangeInHeight } from "@/utils/helpers";
import { useGameBoard } from "@/hooks/useGameBoard";
import { leavesAt, type BoardState, type Side } from "@/game/engine";
import { FADE } from "@/game/animation";

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

function slotViews(state: BoardState, side: Side): SlotView[] {
  return state[side].map((cell) => {
    const res = state.resolutions.find((r) => r.leftKey === cell.key || r.rightKey === cell.key);
    const resolving = res !== undefined;
    return {
      key: cell.key,
      word: cell.word,
      isSelected: state.selected[side] === cell.key,
      matchResult: res ? (res.correct ? "correct" : "incorrect") : null,
      isMatched: cell.matched,
      isAnimating: resolving,
      leavesAt: leavesAt(state, cell),
    };
  });
}

/** Spinner placeholders in the shape of the board, until the first deal (the homepage renders them on the server). */
function loadingViews(side: Side, rows: number): SlotView[] {
  return Array.from({ length: rows }, (_, i) => ({
    key: `loading-${side}-${i}`,
    word: "",
    isSelected: false,
    matchResult: null,
    isMatched: false,
    isAnimating: false,
    leavesAt: null,
    loading: true,
  }));
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
  const { state, selectWord } = useGameBoard({
    pairs,
    numPairs,
    isGameRunning,
    endlessMode,
    mixColumns,
    fastAnimations,
    refreshTrigger,
    onPairSolved,
    onPairMistake,
  });

  // The first board appears without fading in; later boards fade in.
  const [initialOpacity, setInitialOpacity] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setInitialOpacity(0), 2000);
    return () => clearTimeout(timer);
  }, []);

  const left = useMemo(() => (state ? slotViews(state, "left") : loadingViews("left", numPairs)), [state, numPairs]);
  const right = useMemo(() => (state ? slotViews(state, "right") : loadingViews("right", numPairs)), [state, numPairs]);

  // The first deal takes over from the loading board in place (same content key), so the board doesn't fade out and
  // back in. In development React runs effects twice, so the first deal seen may not be deal 1.
  const [firstDealId, setFirstDealId] = useState<number | null>(null);
  if (state && firstDealId === null) setFirstDealId(state.dealId);

  if (!state && !emojis) {
    return <Spinner margin='5vh 0 0 0' />;
  }

  const isFirstDeal = !state || state.dealId === (firstDealId ?? state.dealId);
  const contentKey = isFirstDeal ? "first-deal" : left.length > 0 ? `deal-${state.dealId}` : "no-pairs";

  return (
    <LazyMotion features={loadFeatures}>
      <AnimateChangeInHeight className={styles.ulWrapper} enterDuration={0.2} exitDuration={0.2}>
        <FadeOutSwap contentKey={contentKey} durationMs={FADE.boardOut}>
          {left.length > 0 ? (
            <PairListColumns
              leftColumn={left}
              rightColumn={right}
              isGameRunning={isGameRunning}
              initialOpacity={initialOpacity}
              showSparkles={showSparkles}
              emojis={emojis}
              fastAnimations={fastAnimations}
              onSelectWord={selectWord}
            />
          ) : (
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p>Not enough pairs available. Please add more pairs or adjust your settings.</p>
            </m.div>
          )}
        </FadeOutSwap>
      </AnimateChangeInHeight>
    </LazyMotion>
  );
}

export default PairList;
