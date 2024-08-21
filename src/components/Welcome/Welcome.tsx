"use client";

import styles from "./Welcome.module.css";

import Auth from "../Auth";

import { useUserContext } from "@/contexts/UserContext";

function Welcome() {
  const { user, loading } = useUserContext();

  return (
    <section className={styles.mainWrapper}>
      <section className={styles.hero}>
        <div className={styles.titleContainer}>
          <button className={styles.pushable}>
            <span className={styles.front}>Pair</span>
          </button>
          <button className={styles.pushable}>
            <span className={styles.front}>Learner</span>
          </button>
        </div>
        <p>
          Create, edit, and learn <br />
          word pairs in any language
        </p>
      </section>

      <section className={styles.features}>
        <div className={styles.feature}>
          <h3>Create Word Pairs</h3>
          <p>Add and organize your own word pairs</p>
        </div>
        <div className={styles.feature}>
          <h3>Customize Categories</h3>
          <p>Sort words by language, topic, or anything else</p>
        </div>
        <div className={styles.feature}>
          <h3>Interactive Learning</h3>
          <p>Reinforce memory through dynamic word-pair matching</p>
        </div>
      </section>

      {!user && !loading && <Auth openButtonFontSize='24px' />}
    </section>
  );
}

export default Welcome;
