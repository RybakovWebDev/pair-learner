"use client";
import React, { useEffect, useReducer } from "react";
import { AnimatePresence, LazyMotion, m } from "framer-motion";

import styles from "./PairsDemo.module.css";

import WordCell from "../WordCell";

import { DEMO_PAIRS } from "@/constants";
import { makeid, shuffleArray } from "@/helpers";

const loadFeatures = () => import("../../features").then((res) => res.default);

interface WordState {
  word: string;
  isMatched: boolean;
  isAnimating: boolean;
  id: string;
}

interface State {
  leftColumn: WordState[];
  rightColumn: WordState[];
  selectedPair: { left: string | null; right: string | null };
  listKey: number;
  animationStep: number;
}

type Action =
  | { type: "INITIALIZE_COLUMNS" }
  | { type: "SELECT_LEFT" }
  | { type: "SELECT_RIGHT" }
  | { type: "ANIMATE_MATCH" }
  | { type: "RESET_ANIMATION" }
  | { type: "NEXT_STEP" };

const initialState: State = {
  leftColumn: [],
  rightColumn: [],
  selectedPair: { left: null, right: null },
  listKey: 0,
  animationStep: 0,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INITIALIZE_COLUMNS": {
      const shuffledPairs = shuffleArray(DEMO_PAIRS).slice(0, 4);
      const newLeftColumn: WordState[] = shuffledPairs.map((pair) => ({
        word: pair.word1,
        isMatched: false,
        isAnimating: false,
        id: makeid(15),
      }));
      const newRightColumn: WordState[] = shuffledPairs.map((pair) => ({
        word: pair.word2,
        isMatched: false,
        isAnimating: false,
        id: makeid(15),
      }));
      return {
        ...state,
        leftColumn: shuffleArray(newLeftColumn),
        rightColumn: shuffleArray(newRightColumn),
        listKey: state.listKey + 1,
        animationStep: 0,
      };
    }
    case "SELECT_LEFT": {
      const currentPairIndex = Math.floor(state.animationStep / 4);
      const leftWord = state.leftColumn[currentPairIndex];
      return {
        ...state,
        selectedPair: { left: leftWord.id, right: null },
      };
    }
    case "SELECT_RIGHT": {
      const currentPairIndex = Math.floor(state.animationStep / 4);
      const leftWord = state.leftColumn[currentPairIndex];
      const matchingRightWord = state.rightColumn.find((word) =>
        DEMO_PAIRS.some(
          (pair) =>
            (pair.word1 === leftWord.word && pair.word2 === word.word) ||
            (pair.word2 === leftWord.word && pair.word1 === word.word)
        )
      );
      return {
        ...state,
        selectedPair: { left: leftWord.id, right: matchingRightWord ? matchingRightWord.id : null },
      };
    }
    case "ANIMATE_MATCH": {
      const currentPairIndex = Math.floor(state.animationStep / 4);
      const leftWord = state.leftColumn[currentPairIndex];
      const matchingRightWord = state.rightColumn.find((word) =>
        DEMO_PAIRS.some(
          (pair) =>
            (pair.word1 === leftWord.word && pair.word2 === word.word) ||
            (pair.word2 === leftWord.word && pair.word1 === word.word)
        )
      );
      return {
        ...state,
        leftColumn: state.leftColumn.map((w) => ({
          ...w,
          isAnimating: w.id === leftWord.id,
          isMatched: w.isMatched || w.id === leftWord.id,
        })),
        rightColumn: state.rightColumn.map((w) => ({
          ...w,
          isAnimating: w.id === matchingRightWord?.id,
          isMatched: w.isMatched || w.id === matchingRightWord?.id,
        })),
      };
    }
    case "RESET_ANIMATION": {
      return {
        ...state,
        leftColumn: state.leftColumn.map((w) => ({ ...w, isAnimating: false })),
        rightColumn: state.rightColumn.map((w) => ({ ...w, isAnimating: false })),
        selectedPair: { left: null, right: null },
      };
    }
    case "NEXT_STEP": {
      const nextStep = state.animationStep + 1;
      return nextStep >= 16
        ? reducer({ ...state, animationStep: nextStep }, { type: "INITIALIZE_COLUMNS" })
        : { ...state, animationStep: nextStep };
    }
    default:
      return state;
  }
}

const PairsDemo = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: "INITIALIZE_COLUMNS" });
  }, []);

  useEffect(() => {
    const animationSteps = [
      () => dispatch({ type: "SELECT_LEFT" }),
      () => dispatch({ type: "SELECT_RIGHT" }),
      () => dispatch({ type: "ANIMATE_MATCH" }),
      () => dispatch({ type: "RESET_ANIMATION" }),
    ];

    const currentStep = state.animationStep % 4;
    const delay = currentStep === 3 ? 400 : 1000;

    const timeoutId = setTimeout(() => {
      animationSteps[currentStep]();
      dispatch({ type: "NEXT_STEP" });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [state.animationStep]);

  return (
    <LazyMotion features={loadFeatures}>
      <AnimatePresence mode='wait'>
        <m.section
          className={styles.mainWrapper}
          key={state.listKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ul className={styles.leftColumn}>
            {state.leftColumn.map((wordState, i) => (
              <m.li key={i}>
                <WordCell
                  isSelected={state.selectedPair.left === wordState.id}
                  matchResult={wordState.isAnimating ? "correct" : null}
                  isMatched={wordState.isMatched}
                  isAnimating={wordState.isAnimating}
                  isAnyIncorrectAnimating={false}
                  isAnyCorrectAnimating={wordState.isAnimating}
                  isGameRunning={true}
                >
                  {wordState.word}
                </WordCell>
              </m.li>
            ))}
          </ul>
          <ul className={styles.rightColumn}>
            {state.rightColumn.map((wordState, i) => (
              <m.li key={i}>
                <WordCell
                  isSelected={state.selectedPair.right === wordState.id}
                  matchResult={wordState.isAnimating ? "correct" : null}
                  isMatched={wordState.isMatched}
                  isAnimating={wordState.isAnimating}
                  isAnyIncorrectAnimating={false}
                  isAnyCorrectAnimating={wordState.isAnimating}
                  isGameRunning={true}
                >
                  {wordState.word}
                </WordCell>
              </m.li>
            ))}
          </ul>
        </m.section>
      </AnimatePresence>
    </LazyMotion>
  );
};

export default PairsDemo;
