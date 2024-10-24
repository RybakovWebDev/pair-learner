"use client";
import { m } from "framer-motion";

import styles from "./GameToggles.module.css";

import Toggle from "../Toggle";

import { controlsVariants } from "@/constants";

interface GameTogglesProps {
  showSparkles: boolean;
  onSparklesToggle: () => void;
  endless: boolean;
  onEndlessToggle: () => void;
  mixColumns: boolean;
  onMixToggle: () => void;
  isDisabled: boolean;
}

function GameToggles({
  showSparkles,
  onSparklesToggle,
  endless,
  onEndlessToggle,
  mixColumns,
  onMixToggle,
  isDisabled,
}: GameTogglesProps) {
  return (
    <m.div className={styles.mainWrapper} variants={controlsVariants} animate={isDisabled ? "disabled" : "enabled"}>
      <ul>
        <li className={styles.toggleWrapper}>
          <Toggle labelText='Show sparkles' checked={showSparkles} onChange={onSparklesToggle} />
        </li>
        <li className={styles.toggleWrapper}>
          <Toggle labelText='Endless mode' checked={endless} onChange={onEndlessToggle} />
        </li>
        <li className={styles.toggleWrapper}>
          <Toggle labelText='Mix columns' checked={mixColumns} onChange={onMixToggle} />
        </li>
      </ul>
    </m.div>
  );
}

export default GameToggles;
