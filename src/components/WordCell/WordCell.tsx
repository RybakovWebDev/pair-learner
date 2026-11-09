"use client";
import { useRef, useEffect, useState, useContext, ReactNode } from "react";
import { m } from "framer-motion";

import styles from "./WordCell.module.css";
import Sparkles from "../Sparkles";
import { LeavingContext } from "../FadeOutSwap";

interface WordCellProps {
  isSelected?: boolean;
  matchResult: "correct" | "incorrect" | null;
  isMatched: boolean;
  isAnimating: boolean;
  /** Unused by the game board (only the old PairsDemo passes these); kept so that file still compiles. */
  isAnyIncorrectAnimating?: boolean;
  isAnyCorrectAnimating?: boolean;
  isGameRunning: boolean;
  callback?: () => void;
  isEmoji?: boolean;
  enableSparkles?: boolean;
  /** Fade the word in when the cell mounts (the homepage board taking over from its loading spinners). */
  fadeInContent?: boolean;
  children: ReactNode;
}

function WordCell({
  isSelected,
  matchResult,
  isMatched,
  isAnimating,
  isAnyIncorrectAnimating = false,
  isAnyCorrectAnimating = false,
  isGameRunning,
  callback,
  isEmoji,
  enableSparkles = true,
  fadeInContent = false,
  children,
}: WordCellProps) {
  // Inside a board that's fading out: looks the same, but can't be clicked or focused and isn't announced.
  const ghost = useContext(LeavingContext);
  const [fontSize, setFontSize] = useState(isEmoji ? 24 : 14);
  const [showSparkles, setShowSparkles] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAnimating && matchResult === "correct" && enableSparkles) {
      setShowSparkles(true);
    }
  }, [isAnimating, matchResult, enableSparkles]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSparkles) {
      timer = setTimeout(() => {
        setShowSparkles(false);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showSparkles]);

  useEffect(() => {
    if (isEmoji) {
      setFontSize(24);
      return;
    }

    const resizeText = () => {
      if (textRef.current) {
        const containerWidth = textRef.current.offsetWidth;
        const containerHeight = textRef.current.offsetHeight;
        let size = 15;

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

  const opacity = isMatched ? 0.5 : isGameRunning ? 1 : 0.5;

  return (
    <Sparkles isActive={showSparkles}>
      <m.button
        className={styles.mainWrapper}
        style={{ pointerEvents: isGameRunning && !ghost ? "auto" : "none" }}
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
                borderBottomWidth: "2px",
                y: 2,
              }
            : {}
        }
        onClick={ghost ? undefined : callback}
        tabIndex={ghost ? -1 : undefined}
        aria-hidden={ghost || undefined}
        aria-pressed={ghost ? undefined : isSelected}
        aria-disabled={!isGameRunning || isMatched}
        aria-label={ghost ? undefined : `${children} ${isMatched ? "matched" : ""} ${isSelected ? "selected" : ""}`}
      >
        <m.div
          ref={textRef}
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: isMatched ? 400 : 600,
          }}
          initial={fadeInContent ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </m.div>
      </m.button>
    </Sparkles>
  );
}

export default WordCell;
