// Checks on an engine board that look at words the way the game does: a pick is correct when its two words form any
// pair on the board, whichever pairs the cells were dealt from.
import { isCorrectPair, isFlashing, type BoardState, type Cell } from "@/game/engine";

/** Cells the player can pick: not matched and not flashing. */
export const openCells = (s: BoardState, side: "left" | "right") =>
  s[side].filter((c) => !c.matched && !isFlashing(s, c.key));

/** Every correct pick the player could make right now. */
export function correctPicks(s: BoardState): [Cell, Cell][] {
  const picks: [Cell, Cell][] = [];
  for (const l of openCells(s, "left"))
    for (const r of openCells(s, "right")) if (isCorrectPair(s, l.word, r.word)) picks.push([l, r]);
  return picks;
}

/** Whether every unmatched word can still be matched (a perfect matching by text exists). */
export function canClearBoard(s: BoardState): boolean {
  const L = openCells(s, "left");
  const R = openCells(s, "right");
  if (L.length !== R.length) return false;
  const partnerOfRight: (number | undefined)[] = [];
  const tryLeft = (li: number, seen: Set<number>): boolean => {
    for (let ri = 0; ri < R.length; ri++) {
      if (seen.has(ri) || !isCorrectPair(s, L[li].word, R[ri].word)) continue;
      seen.add(ri);
      const other = partnerOfRight[ri];
      if (other === undefined || tryLeft(other, seen)) {
        partnerOfRight[ri] = li;
        return true;
      }
    }
    return false;
  };
  return L.every((_, li) => tryLeft(li, new Set()));
}
