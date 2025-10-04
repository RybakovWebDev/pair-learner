import { useReducer } from "react";
import { WordState, SelectedPair } from "@/components/PairListColumns";

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

export function useGameState() {
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

  return { state, dispatch };
}
