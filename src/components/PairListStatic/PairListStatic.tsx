import styles from "./PairListStatic.module.css";

import WordCell from "../WordCell";
import Spinner from "../Spinner";

import { DEMO_PAIRS_EMOJI } from "@/constants";

function PairListStatic() {
  const leftColumn = DEMO_PAIRS_EMOJI.slice(0, 5).map((pair) => pair.word1);
  const rightColumn = DEMO_PAIRS_EMOJI.slice(0, 5).map((pair) => pair.word2);

  return (
    <div className={styles.mainWrapper}>
      <div className={styles.ulWrapperInner}>
        <ul className={styles.leftColumn}>
          {leftColumn.map((word, index) => (
            <li key={`left-${index}`}>
              <WordCell
                isSelected={false}
                matchResult={null}
                isMatched={false}
                isAnimating={false}
                isAnyIncorrectAnimating={false}
                isAnyCorrectAnimating={false}
                isGameRunning={true}
                isEmoji={true}
              >
                <Spinner height='25px' width='25px' borderWidth='1px' />
              </WordCell>
            </li>
          ))}
        </ul>
        <ul className={styles.rightColumn}>
          {rightColumn.map((word, index) => (
            <li key={`right-${index}`}>
              <WordCell
                isSelected={false}
                matchResult={null}
                isMatched={false}
                isAnimating={false}
                isAnyIncorrectAnimating={false}
                isAnyCorrectAnimating={false}
                isGameRunning={true}
                isEmoji={true}
              >
                <Spinner height='25px' width='25px' borderWidth='1px' />
              </WordCell>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
export default PairListStatic;
