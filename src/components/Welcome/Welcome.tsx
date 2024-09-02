"use client";

import styles from "./Welcome.module.css";

import Auth from "../Auth";
import PairsDemo from "../PairsDemo";

import { useUserContext } from "@/contexts/UserContext";

function Welcome() {
  const { user, loading } = useUserContext();

  return (
    <section className={styles.mainWrapper}>
      <section className={styles.hero}>
        <p>
          Create, edit, and learn <br />
          word pairs in any language
        </p>
      </section>

      <PairsDemo />

      <section className={styles.features}>
        <div className={styles.feature}>
          <h3>Create Word Pairs</h3>
          <p>
            Add and organize your own <br />
            custom word pairs
          </p>
        </div>
        <div className={styles.feature}>
          <h3>Customize Tags</h3>
          <p>Filter words by language, topic, or anything you want</p>
        </div>
        <div className={styles.feature}>
          <h3>Interactive Learning</h3>
          <p>Reinforce memory through dynamic word-pair matching</p>
        </div>
      </section>

      {!user && !loading && (
        <Auth
          openButtonFontSize='30px'
          margin='2rem 0 0 0'
          openButtonPadding='1rem 2rem'
          openButtonText='Get Started'
        />
      )}
    </section>
  );
}

export default Welcome;
