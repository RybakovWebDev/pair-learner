"use client";
import { useId } from "react";
import { AnimatePresence, m } from "framer-motion";

import styles from "./EditWordsSectionSwitch.module.css";

interface EditWordsSectionSwitcherProps {
  currentSection: "words" | "tags";
  onSectionChange: (section: "words" | "tags") => void;
}

const EditWordsSectionSwitcher = ({ currentSection, onSectionChange }: EditWordsSectionSwitcherProps) => {
  const id = useId();

  const handleClick = (section: "words" | "tags") => {
    onSectionChange(section);
  };

  return (
    <div className={styles.sectionSelector} role='tablist' aria-orientation='horizontal'>
      <button onClick={() => handleClick("words")} role='tab' aria-selected={currentSection === "words"}>
        <h3>Words</h3>
        <AnimatePresence>
          {currentSection === "words" && (
            <m.div
              className={styles.selected}
              layoutId={id}
              initial={{ opacity: 0, borderTopLeftRadius: 15, borderBottomLeftRadius: 15 }}
              animate={{
                opacity: 1,
              }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", damping: 70, stiffness: 1000 }}
              aria-hidden='true'
            />
          )}
        </AnimatePresence>
      </button>
      <button onClick={() => handleClick("tags")} role='tab' aria-selected={currentSection === "tags"}>
        <h3>Tags</h3>
        <AnimatePresence>
          {currentSection === "tags" && (
            <m.div
              className={styles.selected}
              layoutId={id}
              initial={{ opacity: 0, borderTopRightRadius: 15, borderBottomRightRadius: 15 }}
              animate={{
                opacity: 1,
              }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", damping: 70, stiffness: 1000 }}
              aria-hidden='true'
            />
          )}
        </AnimatePresence>
      </button>
    </div>
  );
};

export default EditWordsSectionSwitcher;
