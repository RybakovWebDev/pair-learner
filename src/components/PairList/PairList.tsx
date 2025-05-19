"use client";
import React, { useEffect, useCallback, useRef, useMemo, useReducer } from "react";
import { LazyMotion, m, AnimatePresence } from "framer-motion";

import styles from "./PairList.module.css";

import PairListStatic from "../PairListStatic";
import WordCell from "../WordCell";
import Spinner from "../Spinner";

import { Pair } from "@/constants";
import { AnimateChangeInHeight, makeid, shuffleArray } from "@/utils/helpers";

const loadFeatures = () => import("../../features").then((res) => res.default);

interface PairListProps {
  numPairs?: number;
  isGameRunning: boolean;
  refreshTrigger?: number;
  emojis?: boolean;
  showSparkles?: boolean;
  endlessMode: boolean;
  mixColumns?: boolean;
  pairs: Pair[];
  onPairSolved?: () => void;
  onPairMistake?: () => void;
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

interface GameState {
  leftColumn: WordState[];
  rightColumn: WordState[];
  selectedPairs: SelectedPair[];
  isAnyIncorrectAnimating: boolean;
  isAnyCorrectAnimating: boolean;
  isLoading: boolean;
  initialOpacity: number;
  listKey: number;
}

type Action =
  | { type: "INITIALIZE_COLUMNS"; payload: { left: WordState[]; right: WordState[] } }
  | { type: "SELECT_WORD"; payload: { word: string; id: string; column: "left" | "right" } }
  | { type: "PROCESS_MATCH"; payload: { pair: SelectedPair; isMatch: boolean } }
  | { type: "FINISH_ANIMATION"; payload: { ids: string[] } }
  | { type: "COMPLETE_ROUND" }
  | { type: "RESET_GAME" }
  | { type: "CHANGE_MODE"; payload: boolean }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_INITIAL_OPACITY"; payload: number }
  | { type: "INCREMENT_LIST_KEY" };

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "INITIALIZE_COLUMNS":
      return {
        ...state,
        leftColumn: action.payload.left,
        rightColumn: action.payload.right,
        selectedPairs: [],
        isAnyIncorrectAnimating: false,
        isAnyCorrectAnimating: false,
      };
    case "SELECT_WORD":
      const { word, id, column } = action.payload;
      const otherColumn = column === "left" ? "right" : "left";
      const currentSelection = state.selectedPairs.find((pair) => pair[column] && pair.matchResult === null);
      const otherSelection = state.selectedPairs.find((pair) => pair[otherColumn] && pair.matchResult === null);

      let newSelectedPairs: SelectedPair[];

      if (currentSelection) {
        if (currentSelection[`${column}Id`] === id) {
          newSelectedPairs = state.selectedPairs.filter((pair) => pair !== currentSelection);
        } else {
          newSelectedPairs = state.selectedPairs.map((pair) =>
            pair === currentSelection ? { ...pair, [column]: word, [`${column}Id`]: id } : pair
          );
        }
      } else if (otherSelection) {
        newSelectedPairs = [
          ...state.selectedPairs.filter((pair) => pair !== otherSelection),
          { ...otherSelection, [column]: word, [`${column}Id`]: id },
        ];
      } else {
        newSelectedPairs = [
          ...state.selectedPairs,
          {
            left: column === "left" ? word : "",
            right: column === "right" ? word : "",
            leftId: column === "left" ? id : "",
            rightId: column === "right" ? id : "",
            matchResult: null,
          },
        ];
      }

      return {
        ...state,
        selectedPairs: newSelectedPairs,
      };
    case "PROCESS_MATCH":
      const { pair, isMatch } = action.payload;
      return {
        ...state,
        selectedPairs: state.selectedPairs.map((p) =>
          p.leftId === pair.leftId && p.rightId === pair.rightId
            ? { ...p, matchResult: isMatch ? "correct" : "incorrect" }
            : p
        ),
        isAnyCorrectAnimating: isMatch,
        isAnyIncorrectAnimating: !isMatch,
        leftColumn: state.leftColumn.map((w) => (w.id === pair.leftId ? { ...w, isAnimating: true } : w)),
        rightColumn: state.rightColumn.map((w) => (w.id === pair.rightId ? { ...w, isAnimating: true } : w)),
      };
    case "FINISH_ANIMATION":
      return {
        ...state,
        leftColumn: state.leftColumn.map((w) => (action.payload.ids.includes(w.id) ? { ...w, isAnimating: false } : w)),
        rightColumn: state.rightColumn.map((w) =>
          action.payload.ids.includes(w.id) ? { ...w, isAnimating: false } : w
        ),
        isAnyIncorrectAnimating: false,
        isAnyCorrectAnimating: false,
      };
    case "COMPLETE_ROUND":
      return {
        ...state,
        leftColumn: [],
        rightColumn: [],
        selectedPairs: [],
        isAnyIncorrectAnimating: false,
        isAnyCorrectAnimating: false,
        listKey: state.listKey + 1,
      };
    case "RESET_GAME":
      return {
        ...state,
        selectedPairs: [],
        isAnyIncorrectAnimating: false,
        isAnyCorrectAnimating: false,
      };
    case "CHANGE_MODE":
      return {
        ...state,
      };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_INITIAL_OPACITY":
      return { ...state, initialOpacity: action.payload };
    case "INCREMENT_LIST_KEY":
      return { ...state, listKey: state.listKey + 1 };
    default:
      return state;
  }
}

function PairList({
  numPairs = 5,
  isGameRunning,
  refreshTrigger,
  emojis,
  showSparkles = true,
  endlessMode,
  mixColumns = false,
  pairs,
  onPairSolved,
  onPairMistake,
}: PairListProps) {
  const [state, dispatch] = useReducer(gameReducer, {
    leftColumn: [],
    rightColumn: [],
    selectedPairs: [],
    isAnyIncorrectAnimating: false,
    isAnyCorrectAnimating: false,
    isLoading: true,
    initialOpacity: 1,
    listKey: 0,
  });

  const matchQueue = useRef<SelectedPair[]>([]);
  const isProcessingQueue = useRef(false);
  const currentRoundPairs = useRef<Pair[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => dispatch({ type: "SET_INITIAL_OPACITY", payload: 0 }), 2000);
    return () => clearTimeout(timer);
  }, []);

  const getRandomUniquePairs = useCallback((allPairs: Pair[], count: number) => {
    return shuffleArray(allPairs).slice(0, count);
  }, []);

  const getRandomPair = useCallback(() => {
    const availablePairs = pairs.filter((pair) => !currentRoundPairs.current.some((p) => p.id === pair.id));
    return availablePairs[Math.floor(Math.random() * availablePairs.length)];
  }, [pairs]);

  const initializeColumns = useCallback(() => {
    if (pairs.length < numPairs) {
      console.error("Not enough pairs available");
      dispatch({ type: "INITIALIZE_COLUMNS", payload: { left: [], right: [] } });
      return;
    }

    const selectedPairs = getRandomUniquePairs(pairs, numPairs);
    currentRoundPairs.current = selectedPairs;

    const columnWords = selectedPairs.map((pair) => {
      if (mixColumns && Math.random() < 0.5) {
        return {
          left: {
            word: pair.word2,
            isMatched: false,
            isAnimating: false,
            id: pair.id,
          },
          right: {
            word: pair.word1,
            isMatched: false,
            isAnimating: false,
            id: pair.id,
          },
        };
      }
      return {
        left: {
          word: pair.word1,
          isMatched: false,
          isAnimating: false,
          id: pair.id,
        },
        right: {
          word: pair.word2,
          isMatched: false,
          isAnimating: false,
          id: pair.id,
        },
      };
    });

    dispatch({
      type: "INITIALIZE_COLUMNS",
      payload: {
        left: shuffleArray(columnWords.map((p) => p.left)),
        right: shuffleArray(columnWords.map((p) => p.right)),
      },
    });
    dispatch({ type: "INCREMENT_LIST_KEY" });
  }, [numPairs, pairs, getRandomUniquePairs, mixColumns]);

  useEffect(() => {
    dispatch({ type: "SET_LOADING", payload: true });
    if (pairs.length >= numPairs) {
      initializeColumns();
    } else {
      dispatch({ type: "INITIALIZE_COLUMNS", payload: { left: [], right: [] } });
    }
    dispatch({ type: "SET_LOADING", payload: false });
  }, [pairs, initializeColumns, refreshTrigger, numPairs]);

  useEffect(() => {
    dispatch({ type: "CHANGE_MODE", payload: endlessMode });
    initializeColumns();
  }, [endlessMode, initializeColumns]);

  useEffect(() => {
    if (!isGameRunning) {
      dispatch({ type: "RESET_GAME" });
    }
  }, [isGameRunning]);

  const handleSelectWord = useCallback(
    (word: string, id: string, column: "left" | "right") => {
      if (!isGameRunning || state.isAnyIncorrectAnimating || state.isAnyCorrectAnimating) return;

      const wordState = (column === "left" ? state.leftColumn : state.rightColumn).find((w) => w.id === id);
      if (wordState?.isMatched) return;

      dispatch({ type: "SELECT_WORD", payload: { word, id, column } });
    },
    [isGameRunning, state.leftColumn, state.rightColumn, state.isAnyIncorrectAnimating, state.isAnyCorrectAnimating]
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

    dispatch({ type: "PROCESS_MATCH", payload: { pair, isMatch } });

    if (isMatch && onPairSolved) {
      onPairSolved();
    }

    if (!isMatch && onPairMistake) {
      onPairMistake();
    }

    const exitAnimationDuration = 500;

    setTimeout(
      () => {
        if (isMatch) {
          if (endlessMode) {
            const updatedLeftColumn = state.leftColumn.map((w) =>
              w.id === pair.leftId ? { ...w, isMatched: true, isAnimating: false } : w
            );
            const updatedRightColumn = state.rightColumn.map((w) =>
              w.id === pair.rightId ? { ...w, isMatched: true, isAnimating: false } : w
            );

            const matchedPairsCount = updatedLeftColumn.filter((w) => w.isMatched).length;

            if (matchedPairsCount === 2) {
              let newLeftColumn = [...updatedLeftColumn];
              let newRightColumn = [...updatedRightColumn];

              const matchedLeftPositions = updatedLeftColumn
                .map((w, index) => (w.isMatched ? index : -1))
                .filter((index) => index !== -1);
              const matchedRightPositions = updatedRightColumn
                .map((w, index) => (w.isMatched ? index : -1))
                .filter((index) => index !== -1);

              // Get current pairs and words in the list
              const currentPairs = currentRoundPairs.current.filter(
                (p) =>
                  !matchedLeftPositions.some(
                    (pos) => updatedLeftColumn[pos].word === p.word1 || updatedLeftColumn[pos].word === p.word2
                  )
              );
              const currentWords = new Set(currentPairs.flatMap((p) => [p.word1, p.word2]));

              const getUniquePair = (replacedLeftWord: string, replacedRightWord: string) => {
                let newPair: Pair;
                do {
                  newPair = getRandomPair();
                } while (
                  currentPairs.some(
                    (p) => p.id === newPair.id || currentWords.has(newPair.word1) || currentWords.has(newPair.word2)
                  ) ||
                  newPair.word1 === replacedLeftWord ||
                  newPair.word2 === replacedRightWord
                );
                return newPair;
              };

              // Generate new unique pairs and place them in shuffled positions
              const shuffledPositions = shuffleArray([...matchedLeftPositions]);
              shuffledPositions.forEach((leftPosition, index) => {
                const rightPosition = matchedRightPositions[index];
                const replacedLeftWord = updatedLeftColumn[leftPosition].word;
                const replacedRightWord = updatedRightColumn[rightPosition].word;

                const newPair = getUniquePair(replacedLeftWord, replacedRightWord);
                const newLeftId = `${newPair.id}_${makeid(4)}`;
                const newRightId = `${newPair.id}_${makeid(4)}`;

                // Determine word placement
                const shouldSwap = mixColumns && Math.random() < 0.5;
                const leftWord = shouldSwap ? newPair.word2 : newPair.word1;
                const rightWord = shouldSwap ? newPair.word1 : newPair.word2;

                newLeftColumn[leftPosition] = {
                  word: leftWord,
                  isMatched: false,
                  isAnimating: false,
                  id: newLeftId,
                };

                newRightColumn[rightPosition] = {
                  word: rightWord,
                  isMatched: false,
                  isAnimating: false,
                  id: newRightId,
                };

                // Update currentRoundPairs
                currentRoundPairs.current = currentRoundPairs.current.filter(
                  (p) => p.word1 !== replacedLeftWord && p.word2 !== replacedRightWord
                );
                currentRoundPairs.current.push({
                  ...newPair,
                  id: newPair.id,
                  word1: leftWord,
                  word2: rightWord,
                });
              });

              dispatch({
                type: "INITIALIZE_COLUMNS",
                payload: {
                  left: newLeftColumn,
                  right: newRightColumn,
                },
              });
            } else {
              dispatch({
                type: "INITIALIZE_COLUMNS",
                payload: {
                  left: updatedLeftColumn,
                  right: updatedRightColumn,
                },
              });
            }
          } else {
            const updatedLeftColumn = state.leftColumn.map((w) =>
              w.id === pair.leftId ? { ...w, isMatched: true, isAnimating: false } : w
            );
            const updatedRightColumn = state.rightColumn.map((w) =>
              w.id === pair.rightId ? { ...w, isMatched: true, isAnimating: false } : w
            );

            dispatch({
              type: "INITIALIZE_COLUMNS",
              payload: {
                left: updatedLeftColumn,
                right: updatedRightColumn,
              },
            });

            if (updatedLeftColumn.every((w) => w.isMatched)) {
              setTimeout(() => {
                dispatch({ type: "COMPLETE_ROUND" });
                initializeColumns();
              }, 500);
            }
          }
        } else {
          dispatch({
            type: "INITIALIZE_COLUMNS",
            payload: {
              left: state.leftColumn.map((w) => (w.id === pair.leftId ? { ...w, isAnimating: false } : w)),
              right: state.rightColumn.map((w) => (w.id === pair.rightId ? { ...w, isAnimating: false } : w)),
            },
          });
        }

        dispatch({
          type: "FINISH_ANIMATION",
          payload: { ids: [pair.leftId, pair.rightId] },
        });

        matchQueue.current.shift();
        processMatchQueue();
      },
      isMatch ? exitAnimationDuration : 700
    );
  }, [
    state.leftColumn,
    state.rightColumn,
    endlessMode,
    getRandomPair,
    initializeColumns,
    onPairSolved,
    onPairMistake,
    dispatch,
    mixColumns,
  ]);

  useEffect(() => {
    const completePairs = state.selectedPairs.filter((pair) => pair.left && pair.right && pair.matchResult === null);

    if (completePairs.length > 0) {
      matchQueue.current.push(...completePairs);
      if (!isProcessingQueue.current) {
        processMatchQueue();
      }
    }
  }, [state.selectedPairs, processMatchQueue]);

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
            <m.section
              className={styles.mainWrapper}
              key={state.listKey}
              initial={{ opacity: state.initialOpacity }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                overflowY: isGameRunning && !emojis ? "hidden" : "auto",
                touchAction: isGameRunning && !emojis ? "none" : "auto",
              }}
            >
              <ul className={styles.leftColumn}>
                {memoizedLeftColumn.map((wordState, i) => (
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
                          isSelected={state.selectedPairs.some(
                            (pair) => pair.leftId === wordState.id && pair.matchResult === null
                          )}
                          matchResult={
                            state.selectedPairs.find((pair) => pair.leftId === wordState.id)?.matchResult || null
                          }
                          isMatched={wordState.isMatched}
                          isAnimating={wordState.isAnimating}
                          isAnyIncorrectAnimating={state.isAnyIncorrectAnimating}
                          isAnyCorrectAnimating={state.isAnyCorrectAnimating}
                          isGameRunning={isGameRunning}
                          callback={() => handleSelectWord(wordState.word, wordState.id, "left")}
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
                {memoizedRightColumn.map((wordState, i) => (
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
                          isSelected={state.selectedPairs.some(
                            (pair) => pair.rightId === wordState.id && pair.matchResult === null
                          )}
                          matchResult={
                            state.selectedPairs.find((pair) => pair.rightId === wordState.id)?.matchResult || null
                          }
                          isMatched={wordState.isMatched}
                          isAnimating={wordState.isAnimating}
                          isAnyIncorrectAnimating={state.isAnyIncorrectAnimating}
                          isAnyCorrectAnimating={state.isAnyCorrectAnimating}
                          isGameRunning={isGameRunning}
                          callback={() => handleSelectWord(wordState.word, wordState.id, "right")}
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
