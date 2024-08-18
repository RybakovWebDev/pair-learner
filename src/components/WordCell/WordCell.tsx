"use client";
import React from "react";
import { m } from "framer-motion";

import styles from "./WordCell.module.css";

interface WordCellProps {
  isSelected?: boolean;
  matchResult: "correct" | "incorrect" | null;
  isMatched: boolean;
  isAnimating: boolean;
  isAnyIncorrectAnimating: boolean;
  isAnyCorrectAnimating: boolean;
  isGameRunning: boolean;
  children: string;
}

function WordCell({
  isSelected,
  matchResult,
  isMatched,
  isAnimating,
  isAnyIncorrectAnimating,
  isAnyCorrectAnimating,
  isGameRunning,
  children,
}: WordCellProps) {
  const backgroundColor =
    isAnimating && matchResult === "correct"
      ? "var(--color-background-highlight-win)"
      : isAnimating && matchResult === "incorrect"
      ? "var(--color-background-highlight-fail)"
      : isSelected
      ? "var(--color-background-highlight)"
      : "var(--color-background)";

  const borderColor =
    isAnimating && matchResult === "correct"
      ? "var(--color-border-success)"
      : isAnimating && matchResult === "incorrect"
      ? "var(--color-border-failure)"
      : "var(--color-text)";

  const opacity = isMatched ? 0.2 : isGameRunning ? 1 : 0.5;

  return (
    <m.div
      className={styles.mainWrapper}
      animate={{
        backgroundColor,
        borderColor,
        opacity,
      }}
      initial={{
        backgroundColor: "var(--color-background)",
        borderColor: "var(--color-text)",
        opacity: isGameRunning ? 1 : 0.5,
      }}
      transition={{
        duration: isAnimating ? 0.3 : 0.1,
      }}
      whileTap={
        isGameRunning && !isMatched && !isAnimating && !isAnyIncorrectAnimating && !isAnyCorrectAnimating
          ? {
              borderBottomWidth: "1px",
              y: 2,
            }
          : {}
      }
    >
      {children}
    </m.div>
  );
}

export default WordCell;
