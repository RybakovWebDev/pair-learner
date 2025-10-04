import { Pair } from "@/constants";
import { WordState } from "@/components/PairListColumns";
import { shuffleArray } from "@/utils/helpers";

export function getRandomUniquePairs(allPairs: Pair[], count: number): Pair[] {
  return shuffleArray(allPairs).slice(0, count);
}

export function getRandomPair(pairs: Pair[], excludePairs: Pair[]): Pair {
  const availablePairs = pairs.filter((pair) => !excludePairs.some((p) => p.id === pair.id));
  return availablePairs[Math.floor(Math.random() * availablePairs.length)];
}

export function initializePairListColumns(
  selectedPairs: Pair[],
  mixColumns: boolean
): { left: WordState[]; right: WordState[] } {
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

  return {
    left: shuffleArray(columnWords.map((p) => p.left)),
    right: shuffleArray(columnWords.map((p) => p.right)),
  };
}
