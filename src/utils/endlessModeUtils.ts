import { Pair } from "@/constants";
import { WordState, SelectedPair } from "@/components/PairListColumns";
import { makeid, shuffleArray } from "@/utils/helpers";
import { getRandomPair } from "@/utils/gameUtils";

interface ProcessEndlessModeProps {
  leftColumn: WordState[];
  rightColumn: WordState[];
  pair: SelectedPair;
  currentRoundPairs: Pair[];
  pairs: Pair[];
  mixColumns: boolean;
}

interface ProcessEndlessModeResult {
  newLeftColumn: WordState[];
  newRightColumn: WordState[];
  updatedRoundPairs: Pair[];
}

export function processEndlessMode({
  leftColumn,
  rightColumn,
  pair,
  currentRoundPairs,
  pairs,
  mixColumns,
}: ProcessEndlessModeProps): ProcessEndlessModeResult | null {
  const updatedLeftColumn = leftColumn.map((w) =>
    w.id === pair.leftId ? { ...w, isMatched: true, isAnimating: false } : w
  );
  const updatedRightColumn = rightColumn.map((w) =>
    w.id === pair.rightId ? { ...w, isMatched: true, isAnimating: false } : w
  );

  const matchedPairsCount = updatedLeftColumn.filter((w) => w.isMatched).length;

  if (matchedPairsCount === 2) {
    let newLeftColumn = [...updatedLeftColumn];
    let newRightColumn = [...updatedRightColumn];
    let updatedRoundPairs = [...currentRoundPairs];

    const matchedLeftPositions = updatedLeftColumn
      .map((w, index) => (w.isMatched ? index : -1))
      .filter((index) => index !== -1);
    const matchedRightPositions = updatedRightColumn
      .map((w, index) => (w.isMatched ? index : -1))
      .filter((index) => index !== -1);

    const currentPairs = updatedRoundPairs.filter(
      (p) =>
        !matchedLeftPositions.some(
          (pos) => updatedLeftColumn[pos].word === p.word1 || updatedLeftColumn[pos].word === p.word2
        )
    );
    const currentWords = new Set(currentPairs.flatMap((p) => [p.word1, p.word2]));

    const getUniquePair = (replacedLeftWord: string, replacedRightWord: string) => {
      let newPair: Pair;
      do {
        newPair = getRandomPair(pairs, updatedRoundPairs);
      } while (
        currentPairs.some(
          (p) => p.id === newPair.id || currentWords.has(newPair.word1) || currentWords.has(newPair.word2)
        ) ||
        newPair.word1 === replacedLeftWord ||
        newPair.word2 === replacedRightWord
      );
      return newPair;
    };

    const shuffledPositions = shuffleArray([...matchedLeftPositions]);
    shuffledPositions.forEach((leftPosition, index) => {
      const rightPosition = matchedRightPositions[index];
      const replacedLeftWord = updatedLeftColumn[leftPosition].word;
      const replacedRightWord = updatedRightColumn[rightPosition].word;

      const newPair = getUniquePair(replacedLeftWord, replacedRightWord);
      const newLeftId = `${newPair.id}_${makeid(4)}`;
      const newRightId = `${newPair.id}_${makeid(4)}`;

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

      updatedRoundPairs = updatedRoundPairs.filter(
        (p) => p.word1 !== replacedLeftWord && p.word2 !== replacedRightWord
      );
      updatedRoundPairs.push({
        ...newPair,
        id: newPair.id,
        word1: leftWord,
        word2: rightWord,
      });
    });

    return {
      newLeftColumn,
      newRightColumn,
      updatedRoundPairs,
    };
  } else {
    return {
      newLeftColumn: updatedLeftColumn,
      newRightColumn: updatedRightColumn,
      updatedRoundPairs: currentRoundPairs,
    };
  }
}
