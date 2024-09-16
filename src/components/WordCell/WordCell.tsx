"use client";
import React, { useRef, useEffect, useState } from "react";
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
  isEmoji?: boolean;
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
  isEmoji,
  children,
}: WordCellProps) {
  const [fontSize, setFontSize] = useState(isEmoji ? 24 : 14);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEmoji) {
      setFontSize(24);
      return;
    }

    const resizeText = () => {
      if (textRef.current) {
        const containerWidth = textRef.current.offsetWidth;
        const containerHeight = textRef.current.offsetHeight;
        let size = 14;

        while (size > 8) {
          textRef.current.style.fontSize = `${size}px`;
          if (textRef.current.scrollWidth <= containerWidth && textRef.current.scrollHeight <= containerHeight) {
            break;
          }
          size--;
        }

        setFontSize(size);
      }
    };

    resizeText();
    window.addEventListener("resize", resizeText);

    return () => window.removeEventListener("resize", resizeText);
  }, [children, isEmoji]);

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
      style={{ pointerEvents: isGameRunning ? "auto" : "none" }}
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
      <div
        ref={textRef}
        style={{
          fontSize: `${fontSize}px`,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </m.div>
  );
}

export default WordCell;
