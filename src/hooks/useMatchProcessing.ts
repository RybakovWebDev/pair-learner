import { useRef, useCallback, MutableRefObject } from "react";
import { SelectedPair, WordState } from "@/components/PairListColumns";
import { Pair } from "@/constants";
import { processEndlessMode } from "@/utils/endlessModeUtils";

interface UseMatchProcessingProps {
  state: {
    leftColumn: WordState[];
    rightColumn: WordState[];
    selectedPairs: SelectedPair[];
  };
  dispatch: (action: any) => void;
  currentRoundPairs: MutableRefObject<Pair[]>;
  endlessMode: boolean;
  mixColumns: boolean;
  fastAnimations: boolean;
  pairs: Pair[];
  onPairSolved?: () => void;
  onPairMistake?: () => void;
  initializeColumns: () => void;
}

export function useMatchProcessing({
  state,
  dispatch,
  currentRoundPairs,
  endlessMode,
  mixColumns,
  fastAnimations,
  pairs,
  onPairSolved,
  onPairMistake,
  initializeColumns,
}: UseMatchProcessingProps) {
  const matchQueue = useRef<SelectedPair[]>([]);
  const isProcessingQueue = useRef(false);

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

    const exitAnimationDuration = fastAnimations ? 250 : 500;
    const incorrectDuration = fastAnimations ? 400 : 700;

    setTimeout(
      () => {
        if (isMatch) {
          if (endlessMode) {
            const result = processEndlessMode({
              leftColumn: state.leftColumn,
              rightColumn: state.rightColumn,
              pair,
              currentRoundPairs: currentRoundPairs.current,
              pairs,
              mixColumns,
            });

            if (result) {
              currentRoundPairs.current = result.updatedRoundPairs;
              dispatch({
                type: "INITIALIZE_COLUMNS",
                payload: {
                  left: result.newLeftColumn,
                  right: result.newRightColumn,
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
      isMatch ? exitAnimationDuration : incorrectDuration
    );
  }, [
    state.leftColumn,
    state.rightColumn,
    endlessMode,
    initializeColumns,
    onPairSolved,
    onPairMistake,
    dispatch,
    mixColumns,
    pairs,
    currentRoundPairs,
  ]);

  const processMatch = useCallback(
    (pair: SelectedPair) => {
      matchQueue.current.push(pair);
      if (!isProcessingQueue.current) {
        processMatchQueue();
      }
    },
    [processMatchQueue]
  );

  return { processMatch };
}
