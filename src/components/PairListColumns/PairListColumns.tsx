"use client";
import { useEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import WordCell from "../WordCell";
import Spinner from "../Spinner";
import styles from "./PairListColumns.module.css";

import type { Side } from "@/game/engine";
import { FADE } from "@/game/animation";

/** What a board slot should show. Built by PairList from the game state. */
export type SlotView = {
  key: string;
  word: string;
  isSelected: boolean;
  matchResult: "correct" | "incorrect" | null;
  isMatched: boolean;
  isAnimating: boolean;
  /** Endless mode: when this matched cell leaves the board. It fades out until then. */
  leavesAt: number | null;
  /** A placeholder shown with a spinner until the first board is dealt (homepage demo). */
  loading?: boolean;
};

interface PairListColumnsProps {
  leftColumn: SlotView[];
  rightColumn: SlotView[];
  isGameRunning: boolean;
  initialOpacity: number;
  showSparkles?: boolean;
  emojis?: boolean;
  fastAnimations?: boolean;
  onSelectWord: (side: Side, key: string) => void;
}

interface BoardSlotProps {
  slot: SlotView;
  fastAnimations: boolean;
  children: (fadeInContent: boolean) => React.ReactNode;
}

// One permanent slot on the board. A new cell fades in (cells dealt with the board don't). A leaving cell fades out
// until the game replaces it; the game never waits for that animation, so a stalled one can't freeze it.
function BoardSlot({ slot, fastAnimations, children }: BoardSlotProps) {
  // The first cell in this slot doesn't fade in. When it replaces a loading placeholder, the cell box stays and only
  // its word fades in.
  const [first, setFirst] = useState({ key: slot.key, loading: !!slot.loading, afterLoading: false });
  if (first.loading && !slot.loading) setFirst({ key: slot.key, loading: false, afterLoading: true });
  const fadeRef = useRef<HTMLDivElement>(null);

  // Fades to transparent by `leavesAt`, from wherever the fade is now. If a batch replacement moves `leavesAt` closer,
  // the fade speeds up. Web Animations, because framer-motion won't restart an animation whose target (0) is unchanged.
  const { leavesAt } = slot;
  useEffect(() => {
    const el = fadeRef.current;
    if (leavesAt === null || !el?.animate) return; // jsdom (component tests) has no Web Animations
    const from = getComputedStyle(el).opacity;
    el.getAnimations().forEach((a) => a.cancel());
    el.animate([{ opacity: from }, { opacity: 0 }], {
      duration: Math.max(0, leavesAt - Date.now()),
      easing: "ease-in",
      fill: "forwards",
    });
  }, [leavesAt]);

  const speed = fastAnimations ? "fast" : "normal";
  return (
    <m.div
      key={slot.key}
      initial={slot.key === first.key ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: FADE.cellIn[speed] / 1000 }}
    >
      <div ref={fadeRef}>{children(first.afterLoading && slot.key === first.key)}</div>
    </m.div>
  );
}

function PairListColumns({
  leftColumn,
  rightColumn,
  isGameRunning,
  initialOpacity,
  showSparkles = true,
  emojis,
  fastAnimations = false,
  onSelectWord,
}: PairListColumnsProps) {
  const renderColumn = (side: Side, column: SlotView[]) => (
    <ul className={side === "left" ? styles.leftColumn : styles.rightColumn}>
      {column.map((slot, i) => (
        <li key={i}>
          <BoardSlot slot={slot} fastAnimations={fastAnimations}>
            {(fadeInContent) => (
              <WordCell
                isSelected={slot.isSelected}
                matchResult={slot.matchResult}
                isMatched={slot.isMatched}
                isAnimating={slot.isAnimating}
                isGameRunning={isGameRunning}
                callback={() => onSelectWord(side, slot.key)}
                enableSparkles={showSparkles}
                isEmoji={emojis}
                fadeInContent={fadeInContent}
              >
                {slot.loading ? <Spinner height='25px' width='25px' borderWidth='1px' margin='0' /> : slot.word}
              </WordCell>
            )}
          </BoardSlot>
        </li>
      ))}
    </ul>
  );

  return (
    <m.section
      className={styles.mainWrapper}
      initial={{ opacity: initialOpacity }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        overflowY: isGameRunning && !emojis ? "hidden" : "auto",
        touchAction: isGameRunning && !emojis ? "none" : "auto",
      }}
    >
      {renderColumn("left", leftColumn)}
      {renderColumn("right", rightColumn)}
    </m.section>
  );
}

export default PairListColumns;
