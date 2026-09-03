"use client";
import { useId } from "react";
import { AnimatePresence, m } from "framer-motion";

import styles from "./GameRowCountSelector.module.css";

import { controlsVariants } from "@/constants";

interface GameRowCountSelectorProps {
  rowCount: number;
  rowCountOptions: number[];
  isDisabled: boolean;
  onRowCountChange: (rows: number) => void;
}

function GameRowCountSelector({ rowCount, rowCountOptions, isDisabled, onRowCountChange }: GameRowCountSelectorProps) {
  const id = useId();
  const firstOption = rowCountOptions[0];
  const lastOption = rowCountOptions[rowCountOptions.length - 1];
  return (
    <m.div className={styles.rowCountWrapper} variants={controlsVariants} animate={isDisabled ? "disabled" : "enabled"}>
      <label htmlFor='row-count-select'>Number of rows:</label>

      <div className={styles.rowsSelector}>
        {rowCountOptions.map((r) => (
          <button key={r} onClick={() => onRowCountChange(r)}>
            <h3>{r}</h3>
            <AnimatePresence>
              {rowCount === r ? (
                <m.div
                  className={styles.hovered}
                  layoutId={id}
                  initial={{ opacity: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
                  animate={{
                    opacity: 1,
                    borderTopLeftRadius: rowCount === firstOption ? 15 : 0,
                    borderTopRightRadius: rowCount === lastOption ? 15 : 0,
                  }}
                  exit={{ opacity: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
                  transition={{ type: "spring", damping: 70, stiffness: 1000 }}
                />
              ) : null}
            </AnimatePresence>
          </button>
        ))}
      </div>
    </m.div>
  );
}

export default GameRowCountSelector;
