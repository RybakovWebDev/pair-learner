"use client";
import { m } from "framer-motion";

import styles from "./GameToggles.module.css";

import { controlsVariants } from "@/constants";

interface GameTogglesProps {
  showSparkles: boolean;
  onSparklesToggle: () => void;
  isDisabled: boolean;
}

function GameToggles({ showSparkles, onSparklesToggle, isDisabled }: GameTogglesProps) {
  return (
    <m.div className={styles.mainWrapper} variants={controlsVariants} animate={isDisabled ? "disabled" : "enabled"}>
      <ul>
        <li className={styles.toggleWrapper}>
          <label className={styles.toggleLabel}>
            <span className={styles.labelText}>Show sparkles</span>
            <div className={styles.switchContainer}>
              <input
                type='checkbox'
                className={styles.toggleInput}
                checked={showSparkles}
                onChange={onSparklesToggle}
              />
              <span className={`${styles.slider} ${styles.sliderRound}`}></span>
            </div>
          </label>
        </li>
      </ul>
    </m.div>
  );
}

export default GameToggles;
