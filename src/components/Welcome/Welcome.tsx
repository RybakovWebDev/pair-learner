"use client";

import styles from "./Welcome.module.css";

import Auth from "../Auth";

import { useUserContext } from "@/contexts/UserContext";

function Welcome() {
  const { user, loading } = useUserContext();
  return (
    <section className={styles.mainWrapper}>
      <section className={styles.hero}>
        <h2>
          Welcome to <br />
          Pair Learner
        </h2>
        <p>
          Create, edit, and learn word pairs <br /> in any language
        </p>
      </section>

      <section className={styles.features}>
        <div className={styles.feature}>
          <h3>Create Word Pairs</h3>
          <p>Add and organize your own word pairs</p>
        </div>
        <div className={styles.feature}>
          <h3>Customize Categories</h3>
          <p>Sort words by language or topic</p>
        </div>
        <div className={styles.feature}>
          <h3>Play Matching Game</h3>
          <p>Memorize the words by matching randomized columns</p>
        </div>
      </section>

      {!user && !loading && <Auth openButtonFontSize='24px' />}
    </section>
  );
}

export default Welcome;
