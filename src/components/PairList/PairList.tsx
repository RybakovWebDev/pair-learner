"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { LazyMotion, m, AnimatePresence } from "framer-motion";

import styles from "./PairList.module.css";

import WordCell from "../WordCell";

import { testUser } from "@/constants";
import { AnimateChangeInHeight, makeid, shuffleArray } from "@/helpers";

const loadFeatures = () => import("../../featuresMax").then((res) => res.default);

interface PairListProps {
  numPairs?: number;
  isGameRunning: boolean;
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

function PairList({ numPairs = 5, isGameRunning }: PairListProps) {
  const [listKey, setListKey] = useState(0);
  const [leftColumn, setLeftColumn] = useState<WordState[]>([]);
  const [rightColumn, setRightColumn] = useState<WordState[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<SelectedPair[]>([]);
  const [isAnyIncorrectAnimating, setIsAnyIncorrectAnimating] = useState(false);
  const [isAnyCorrectAnimating, setIsAnyCorrectAnimating] = useState(false);
  const matchQueue = useRef<SelectedPair[]>([]);
  const isProcessingQueue = useRef(false);
  const allPairs = useRef<Array<{ word1: string; word2: string }>>(testUser.pairsTesting);
  const pendingSelections = useRef<{
    left: string | null;
    right: string | null;
    leftId: string | null;
    rightId: string | null;
  }>({ left: null, right: null, leftId: null, rightId: null });

  const getRandomPair = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * allPairs.current.length);
    return allPairs.current[randomIndex];
  }, []);

  const initializeColumns = useCallback(() => {
    const newLeftColumn: WordState[] = [];
    const newRightColumn: WordState[] = [];

    for (let i = 0; i < numPairs; i++) {
      const pair = getRandomPair();

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
    }

    setLeftColumn(shuffleArray(newLeftColumn));
    setRightColumn(shuffleArray(newRightColumn));
    setListKey((prevKey) => prevKey + 1);
  }, [numPairs, getRandomPair]);

  useEffect(() => {
    initializeColumns();
  }, [initializeColumns]);

  const getNewPair = useCallback(() => {
    const newPair = getRandomPair();
    return {
      left: { word: newPair.word1, isMatched: false, isAnimating: false, id: makeid(15) },
      right: { word: newPair.word2, isMatched: false, isAnimating: false, id: makeid(15) },
    };
  }, [getRandomPair]);

  const handleSelectWord = useCallback(
    (word: string, id: string, column: "left" | "right") => {
      if (!isGameRunning || isAnyIncorrectAnimating || isAnyCorrectAnimating) return;

      const columnState = column === "left" ? leftColumn : rightColumn;
      const wordState = columnState.find((w) => w.id === id);

      if (wordState?.isMatched) return;

      // Update pending selections
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
    [leftColumn, rightColumn, isAnyIncorrectAnimating, isGameRunning]
  );

  const processMatchQueue = useCallback(() => {
    if (matchQueue.current.length === 0) {
      isProcessingQueue.current = false;
      return;
    }

    isProcessingQueue.current = true;
    const pair = matchQueue.current[0];
    const isMatch = allPairs.current.some(
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
    const delayBeforeReplacement = 100;

    setTimeout(
      () => {
        if (isMatch) {
          setLeftColumn((prev) => prev.map((w) => (w.id === pair.leftId ? { ...w, isMatched: true } : w)));
          setRightColumn((prev) => prev.map((w) => (w.id === pair.rightId ? { ...w, isMatched: true } : w)));

          setTimeout(() => {
            const newPair = getNewPair();
            setLeftColumn((prev) =>
              prev.map((w) => {
                if (w.id === pair.leftId) {
                  return newPair.left;
                }
                return w;
              })
            );
            setRightColumn((prev) =>
              prev.map((w) => {
                if (w.id === pair.rightId) {
                  return newPair.right;
                }
                return w;
              })
            );

            // Handle pending selections after replacing the matched pair
            if (pendingSelections.current.left || pendingSelections.current.right) {
              setSelectedPairs((prevPairs) => {
                const newSelection = {
                  left: pendingSelections.current.left || "",
                  right: pendingSelections.current.right || "",
                  leftId: pendingSelections.current.leftId || "",
                  rightId: pendingSelections.current.rightId || "",
                  matchResult: null,
                };
                return [...prevPairs, newSelection];
              });
              pendingSelections.current = { left: null, right: null, leftId: null, rightId: null };
            }
            setIsAnyCorrectAnimating(false);
          }, delayBeforeReplacement);
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
  }, [getNewPair]);

  useEffect(() => {
    const completePairs = selectedPairs.filter((pair) => pair.left && pair.right && pair.matchResult === null);

    if (completePairs.length > 0) {
      matchQueue.current.push(...completePairs);
      if (!isProcessingQueue.current) {
        processMatchQueue();
      }
    }
  }, [selectedPairs, processMatchQueue]);

  return (
    <LazyMotion features={loadFeatures}>
      <AnimateChangeInHeight className={styles.ulWrapper} enterDuration={0.2} exitDuration={0.2}>
        <AnimatePresence mode='wait'>
          <m.section
            className={styles.mainWrapper}
            key={listKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ul className={styles.leftColumn}>
              {leftColumn.map((wordState, i) => (
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
                      >
                        {wordState.word}
                      </WordCell>
                    </m.div>
                  </AnimatePresence>
                </m.li>
              ))}
            </ul>
          </m.section>
        </AnimatePresence>
      </AnimateChangeInHeight>
    </LazyMotion>
  );
}

export default PairList;
