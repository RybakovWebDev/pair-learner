"use client";
import { useState } from "react";
import { AnimatePresence, LazyMotion, m } from "framer-motion";

import styles from "./EditWords.module.css";

import { Trash2 } from "react-feather";

import { testUser } from "@/constants";

const loadFeatures = () => import("../../features").then((res) => res.default);

const pairs = testUser.pairs;

function EditWords() {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handlePairDelete = () => {
    setConfirmDelete(!confirmDelete);
  };

  return (
    <LazyMotion features={loadFeatures}>
      <section className={styles.wrapperMain}>
        <div className={styles.introWrapper}>
          <h3>Word Editor</h3>
          <p>Here you can add, edit and remove your word pairs.</p>
          <p>Each pair also has a Category field that can be used for all kinds of purposes.</p>
          <p>
            For example, you can create categories for different languages (English, German, Japanese), or sort the
            words by type (Family, Food, Animals) if you are only learning a single language.
          </p>
          <p>Experiment to find what works best for you!</p>
        </div>
        <ul className={styles.list}>
          {pairs.map((p) => {
            return (
              <li key={p.id}>
                <div className={styles.wordDetailsWrapper}>
                  <div className={styles.wordWrapperOuter}>
                    <p className={styles.wordAttribute}>Word 1: </p>
                    <div className={styles.wordWrapper1}>
                      <p>{p.word1}</p>
                    </div>
                  </div>

                  <div className={styles.wordWrapperOuter}>
                    <p className={styles.wordAttribute}>Word 2: </p>
                    <div className={styles.wordWrapper2}>
                      <p>{p.word2}</p>
                    </div>
                  </div>

                  <div className={styles.categoryWrapperOuter}>
                    <p className={styles.wordAttribute}>Category: </p>
                    <div className={styles.categoryWrapper}>
                      <p>{p.category ? p.category : "—"}</p>
                    </div>
                  </div>
                </div>

                <m.button
                  className={styles.deleteButton}
                  onClick={handlePairDelete}
                  initial={{ width: "4rem" }}
                  animate={{ width: confirmDelete ? "10rem" : "4rem" }}
                >
                  <AnimatePresence mode='wait'>
                    {confirmDelete ? (
                      <m.div
                        key={"confirmDelete"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <p>Delete pair?</p>
                      </m.div>
                    ) : (
                      <m.div
                        key={"confirmDeleteIcon"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Trash2 />
                      </m.div>
                    )}
                  </AnimatePresence>
                </m.button>
              </li>
            );
          })}
        </ul>
      </section>
    </LazyMotion>
  );
}

export default EditWords;
