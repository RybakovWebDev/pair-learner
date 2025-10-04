"use client";
import React from "react";
import { m, AnimatePresence } from "framer-motion";
import WordCell from "../WordCell";
import styles from "./PairListColumns.module.css";

export interface WordState {
  word: string;
  isMatched: boolean;
  isAnimating: boolean;
  id: string;
}

export interface SelectedPair {
  left: string;
  right: string;
  leftId: string;
  rightId: string;
  matchResult: "correct" | "incorrect" | null;
}

interface PairListColumnsProps {
  leftColumn: WordState[];
  rightColumn: WordState[];
  selectedPairs: SelectedPair[];
  isAnyIncorrectAnimating: boolean;
  isAnyCorrectAnimating: boolean;
  isGameRunning: boolean;
  initialOpacity: number;
  showSparkles?: boolean;
  emojis?: boolean;
  onSelectWord: (word: string, id: string, column: "left" | "right") => void;
}

function PairListColumns({
  leftColumn,
  rightColumn,
  selectedPairs,
  isAnyIncorrectAnimating,
  isAnyCorrectAnimating,
  isGameRunning,
  initialOpacity,
  showSparkles = true,
  emojis,
  onSelectWord,
}: PairListColumnsProps) {
  return (
    <m.section
      className={styles.mainWrapper}
      initial={{ opacity: initialOpacity }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        overflowY: isGameRunning && !emojis ? "hidden" : "auto",
        touchAction: isGameRunning && !emojis ? "none" : "auto",
      }}
    >
      <ul className={styles.leftColumn}>
        {leftColumn.map((wordState, i) => (
          <m.li key={i}>
            <AnimatePresence mode='wait' initial={false}>
              <m.div
                key={wordState.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.5 }}
              >
                <WordCell
                  isSelected={selectedPairs.some((pair) => pair.leftId === wordState.id && pair.matchResult === null)}
                  matchResult={selectedPairs.find((pair) => pair.leftId === wordState.id)?.matchResult || null}
                  isMatched={wordState.isMatched}
                  isAnimating={wordState.isAnimating}
                  isAnyIncorrectAnimating={isAnyIncorrectAnimating}
                  isAnyCorrectAnimating={isAnyCorrectAnimating}
                  isGameRunning={isGameRunning}
                  callback={() => onSelectWord(wordState.word, wordState.id, "left")}
                  enableSparkles={showSparkles}
                  isEmoji={emojis}
                >
                  {wordState.word}
                </WordCell>
              </m.div>
            </AnimatePresence>
          </m.li>
        ))}
      </ul>

      <ul className={styles.rightColumn}>
        {rightColumn.map((wordState, i) => (
          <m.li key={i}>
            <AnimatePresence mode='wait' initial={false}>
              <m.div
                key={wordState.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.5 }}
              >
                <WordCell
                  isSelected={selectedPairs.some((pair) => pair.rightId === wordState.id && pair.matchResult === null)}
                  matchResult={selectedPairs.find((pair) => pair.rightId === wordState.id)?.matchResult || null}
                  isMatched={wordState.isMatched}
                  isAnimating={wordState.isAnimating}
                  isAnyIncorrectAnimating={isAnyIncorrectAnimating}
                  isAnyCorrectAnimating={isAnyCorrectAnimating}
                  isGameRunning={isGameRunning}
                  callback={() => onSelectWord(wordState.word, wordState.id, "right")}
                  enableSparkles={showSparkles}
                  isEmoji={emojis}
                >
                  {wordState.word}
                </WordCell>
              </m.div>
            </AnimatePresence>
          </m.li>
        ))}
      </ul>
    </m.section>
  );
}

export default PairListColumns;
