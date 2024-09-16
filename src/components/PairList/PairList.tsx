"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { LazyMotion, m, AnimatePresence } from "framer-motion";

import styles from "./PairList.module.css";

import WordCell from "../WordCell";
import Spinner from "../Spinner";

import { Pair } from "@/constants";
import { AnimateChangeInHeight, makeid, shuffleArray } from "@/helpers";

const loadFeatures = () => import("../../features").then((res) => res.default);

interface PairListProps {
  numPairs?: number;
  isGameRunning: boolean;
  refreshTrigger?: number;
  emojis?: boolean;
  pairs: Pair[];
}

interface WordState {
  word: string;
  isMatched: boolean;
  isAnimating: boolean;
  id: string;
}

interface SelectedPair {
  left: string;
  right: string;
  leftId: string;
  rightId: string;
  matchResult: "correct" | "incorrect" | null;
}

function PairList({ numPairs = 5, isGameRunning, refreshTrigger, emojis, pairs }: PairListProps) {
  const [listKey, setListKey] = useState(0);
  const [leftColumn, setLeftColumn] = useState<WordState[]>([]);
  const [rightColumn, setRightColumn] = useState<WordState[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<SelectedPair[]>([]);
  const [isAnyIncorrectAnimating, setIsAnyIncorrectAnimating] = useState(false);
  const [isAnyCorrectAnimating, setIsAnyCorrectAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const matchQueue = useRef<SelectedPair[]>([]);
  const isProcessingQueue = useRef(false);
  const pendingSelections = useRef<{
    left: string | null;
    right: string | null;
    leftId: string | null;
    rightId: string | null;
  }>({ left: null, right: null, leftId: null, rightId: null });
  const currentRoundPairs = useRef<Pair[]>([]);

  const getRandomUniquePairs = useCallback((allPairs: Pair[], count: number) => {
    const shuffled = [...allPairs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }, []);

  const initializeColumns = useCallback(() => {
    if (pairs.length < numPairs) {
      console.error("Not enough pairs available");
      setLeftColumn([]);
      setRightColumn([]);
      return;
    }

    const selectedPairs = getRandomUniquePairs(pairs, numPairs);
    currentRoundPairs.current = selectedPairs;

    const newLeftColumn: WordState[] = [];
    const newRightColumn: WordState[] = [];

    selectedPairs.forEach((pair) => {
      newLeftColumn.push({
        word: pair.word1,
        isMatched: false,
        isAnimating: false,
        id: makeid(15),
      });
      newRightColumn.push({
        word: pair.word2,
        isMatched: false,
        isAnimating: false,
        id: makeid(15),
      });
    });

    setLeftColumn(shuffleArray(newLeftColumn));
    setRightColumn(shuffleArray(newRightColumn));
  }, [numPairs, pairs, getRandomUniquePairs]);

  useEffect(() => {
    setIsLoading(true);

    if (pairs.length >= numPairs) {
      initializeColumns();
      setListKey((prevKey) => prevKey + 1);
    } else {
      setLeftColumn([]);
      setRightColumn([]);
    }

    setIsLoading(false);
  }, [pairs, initializeColumns, refreshTrigger, numPairs]);

  useEffect(() => {
    if (!isGameRunning) {
      setSelectedPairs((prevPairs) => prevPairs.filter((pair) => pair.matchResult === "correct"));
      pendingSelections.current = { left: null, right: null, leftId: null, rightId: null };
    }
  }, [isGameRunning]);

  const handleSelectWord = useCallback(
    (word: string, id: string, column: "left" | "right") => {
      if (!isGameRunning || isAnyIncorrectAnimating || isAnyCorrectAnimating) return;

      const columnState = column === "left" ? leftColumn : rightColumn;
      const wordState = columnState.find((w) => w.id === id);

      if (wordState?.isMatched) return;

      pendingSelections.current[column] = word;
      pendingSelections.current[`${column}Id`] = id;

      setSelectedPairs((prevPairs) => {
        const otherColumn = column === "left" ? "right" : "left";
        const currentColumnSelection = prevPairs.find((pair) => pair[column] && pair.matchResult === null);
        const otherColumnSelection = prevPairs.find((pair) => pair[otherColumn] && pair.matchResult === null);

        if (currentColumnSelection) {
          if (currentColumnSelection[`${column}Id`] === id) {
            pendingSelections.current[column] = null;
            pendingSelections.current[`${column}Id`] = null;
            return prevPairs.filter((pair) => pair !== currentColumnSelection);
          } else {
            return prevPairs.map((pair) =>
              pair === currentColumnSelection ? { ...pair, [column]: word, [`${column}Id`]: id } : pair
            );
          }
        } else if (otherColumnSelection) {
          return [
            ...prevPairs.filter((pair) => pair !== otherColumnSelection),
            {
              ...otherColumnSelection,
              [column]: word,
              [`${column}Id`]: id,
            },
          ];
        } else {
          return [
            ...prevPairs,
            {
              left: column === "left" ? word : "",
              right: column === "right" ? word : "",
              leftId: column === "left" ? id : "",
              rightId: column === "right" ? id : "",
              matchResult: null,
            },
          ];
        }
      });
    },
    [leftColumn, rightColumn, isAnyIncorrectAnimating, isAnyCorrectAnimating, isGameRunning]
  );

  const processMatchQueue = useCallback(() => {
    if (matchQueue.current.length === 0) {
      isProcessingQueue.current = false;
      return;
    }

    isProcessingQueue.current = true;
    const pair = matchQueue.current[0];
    const isMatch = currentRoundPairs.current.some(
      (testPair) =>
        (testPair.word1 === pair.left && testPair.word2 === pair.right) ||
        (testPair.word1 === pair.right && testPair.word2 === pair.left)
    );

    setSelectedPairs((prevPairs) => {
      const updatedPairs = prevPairs.map((p) =>
        p.leftId === pair.leftId && p.rightId === pair.rightId
          ? ({ ...p, matchResult: isMatch ? "correct" : "incorrect" } as SelectedPair)
          : p
      );
      return updatedPairs;
    });

    if (isMatch) {
      setIsAnyCorrectAnimating(true);
    } else {
      setIsAnyIncorrectAnimating(true);
    }

    setLeftColumn((prev) => prev.map((w) => (w.id === pair.leftId ? { ...w, isAnimating: true } : w)));
    setRightColumn((prev) => prev.map((w) => (w.id === pair.rightId ? { ...w, isAnimating: true } : w)));

    const exitAnimationDuration = 500;

    setTimeout(
      () => {
        if (isMatch) {
          setLeftColumn((prev) => {
            const newColumn = prev.map((w) =>
              w.id === pair.leftId ? { ...w, isMatched: true, isAnimating: false } : w
            );
            if (newColumn.every((w) => w.isMatched)) {
              setTimeout(() => {
                setListKey((prevKey) => prevKey + 1);
                initializeColumns();
              }, 500);
            }
            return newColumn;
          });
          setRightColumn((prev) => {
            const newColumn = prev.map((w) =>
              w.id === pair.rightId ? { ...w, isMatched: true, isAnimating: false } : w
            );
            return newColumn;
          });

          setIsAnyCorrectAnimating(false);
        } else {
          setLeftColumn((prev) => prev.map((w) => (w.id === pair.leftId ? { ...w, isAnimating: false } : w)));
          setRightColumn((prev) => prev.map((w) => (w.id === pair.rightId ? { ...w, isAnimating: false } : w)));
          setIsAnyIncorrectAnimating(false);
        }

        setSelectedPairs((prevPairs) =>
          prevPairs.filter((p) => p.leftId !== pair.leftId || p.rightId !== pair.rightId || p.matchResult === "correct")
        );

        matchQueue.current.shift();
        processMatchQueue();
      },
      isMatch ? exitAnimationDuration : 700
    );
  }, [initializeColumns]);

  useEffect(() => {
    const completePairs = selectedPairs.filter((pair) => pair.left && pair.right && pair.matchResult === null);

    if (completePairs.length > 0) {
      matchQueue.current.push(...completePairs);
      if (!isProcessingQueue.current) {
        processMatchQueue();
      }
    }
  }, [selectedPairs, processMatchQueue]);

  const memoizedLeftColumn = useMemo(() => leftColumn, [leftColumn]);
  const memoizedRightColumn = useMemo(() => rightColumn, [rightColumn]);

  if (isLoading && !emojis) {
    return <Spinner margin='5vh 0 0 0' />;
  }

  const shouldRenderColumns =
    emojis || (memoizedLeftColumn.length >= numPairs && memoizedRightColumn.length >= numPairs);

  return (
    <LazyMotion features={loadFeatures}>
      <AnimateChangeInHeight className={styles.ulWrapper} enterDuration={0.2} exitDuration={0.2}>
        <AnimatePresence mode='wait'>
          {shouldRenderColumns ? (
            <m.section
              className={styles.mainWrapper}
              key={listKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ul className={styles.leftColumn}>
                {memoizedLeftColumn.map((wordState, i) => (
                  <m.li key={i} onClick={() => handleSelectWord(wordState.word, wordState.id, "left")}>
                    <AnimatePresence mode='wait' initial={false}>
                      <m.div
                        key={wordState.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.5 }}
                      >
                        <WordCell
                          isSelected={selectedPairs.some(
                            (pair) => pair.leftId === wordState.id && pair.matchResult === null
                          )}
                          matchResult={selectedPairs.find((pair) => pair.leftId === wordState.id)?.matchResult || null}
                          isMatched={wordState.isMatched}
                          isAnimating={wordState.isAnimating}
                          isAnyIncorrectAnimating={isAnyIncorrectAnimating}
                          isAnyCorrectAnimating={isAnyCorrectAnimating}
                          isGameRunning={isGameRunning}
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
                {memoizedRightColumn.map((wordState, i) => (
                  <m.li key={i} onClick={() => handleSelectWord(wordState.word, wordState.id, "right")}>
                    <AnimatePresence mode='wait' initial={false}>
                      <m.div
                        key={wordState.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.5 }}
                      >
                        <WordCell
                          isSelected={selectedPairs.some(
                            (pair) => pair.rightId === wordState.id && pair.matchResult === null
                          )}
                          matchResult={selectedPairs.find((pair) => pair.rightId === wordState.id)?.matchResult || null}
                          isMatched={wordState.isMatched}
                          isAnimating={wordState.isAnimating}
                          isAnyIncorrectAnimating={isAnyIncorrectAnimating}
                          isAnyCorrectAnimating={isAnyCorrectAnimating}
                          isGameRunning={isGameRunning}
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
