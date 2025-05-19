"use client";
import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";

import styles from "./EditWordsHelp.module.css";

import { HelpCircle } from "react-feather";

import { AnimateChangeInHeight } from "@/utils/helpers";

const EditWordsHelp = () => {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <m.button
      className={styles.helpOuterWrapper}
      onClick={() => setHelpOpen(!helpOpen)}
      animate={{ backgroundColor: "var(--color-background)" }}
      whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
    >
      <p>View Help</p>
      <HelpCircle />

      <AnimateChangeInHeight>
        <AnimatePresence>
          {helpOpen && (
            <m.div
              key={"help"}
              className={styles.helpInnerWrapper}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p>Here you can add, edit and remove your word pairs.</p>
              <p>
                Each pair also has <b>Tags</b> that can be used for all kinds of purposes.
              </p>
              <p>
                For example, you can create tags for different languages (English, German, Japanese etc.), or sort the
                words by type (Family, Food, Animals and so on) if you are only learning a single language.
              </p>
              <p>Experiment to find what works best for you!</p>
              <span>Hints:</span>
              <ul>
                <li>You can press &quot;Enter&quot; to confirm changes to a word pair</li>
                <li>
                  You can use browser extensions like Duolingo Ninja to download all of your known Duolingo words into a
                  table and import them here
                </li>
              </ul>
            </m.div>
          )}
        </AnimatePresence>
      </AnimateChangeInHeight>
    </m.button>
  );
};

export default EditWordsHelp;
