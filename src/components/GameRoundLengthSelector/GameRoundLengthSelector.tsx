import { m, AnimatePresence } from "framer-motion";

import styles from "./GameRoundLengthSelector.module.css";

import { controlsVariants } from "@/constants";

interface GameRoundLengthSelectorProps {
  roundLength: number;
  isDisabled: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function GameRoundLengthSelector({ roundLength, isDisabled, onChange }: GameRoundLengthSelectorProps) {
  return (
    <m.div
      className={styles.roundLengthWrapper}
      variants={controlsVariants}
      animate={isDisabled ? "disabled" : "enabled"}
    >
      <label htmlFor='length'>Round length:</label>

      <div className={styles.roundLengthSecondsWrapper}>
        <AnimatePresence mode='wait' initial={false}>
          {roundLength !== 210 ? (
            <m.div
              key='seconds-wrapper'
              initial={{ opacity: 0, y: "-100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.secondsCountWrapper}>
                <AnimatePresence mode='wait'>
                  <m.p
                    className={styles.roundLengthSeconds}
                    key={roundLength}
                    initial={{ opacity: 0, y: "-100%" }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: "100%" }}
                    transition={{ duration: 0.2 }}
                  >
                    {roundLength}
                  </m.p>
                </AnimatePresence>
              </div>
              <p>seconds</p>
            </m.div>
          ) : (
            <m.p
              className={styles.roundLengthInfinite}
              key='infinite'
              initial={{ opacity: 0, y: "-100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ duration: 0.2 }}
            >
              Infinite
            </m.p>
          )}
        </AnimatePresence>
      </div>

      <input
        type='range'
        id='length'
        name='length'
        min='30'
        max='210'
        step='30'
        value={roundLength}
        onChange={onChange}
        disabled={isDisabled}
      />
    </m.div>
  );
}

export default GameRoundLengthSelector;
