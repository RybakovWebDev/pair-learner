"use client";

import styles from "./Welcome.module.css";

import Spinner from "../Spinner";
import Auth from "../Auth";
import PairList from "../PairList";

import { useUserContext } from "@/contexts/UserContext";
import { DEMO_PAIRS_EMOJI } from "@/constants";

function Welcome() {
  const { user, loading } = useUserContext();

  return (
    <section className={styles.mainWrapper}>
      <section className={styles.hero}>
        <p>
          Learn <span>anything</span> <br /> with customizable <br /> word pairs
        </p>
      </section>

      <div className={styles.pairsWrapper}>
        <PairList pairs={DEMO_PAIRS_EMOJI} isGameRunning emojis />
      </div>

      <section className={styles.features}>
        <div className={styles.feature}>
          <h3>Custom Word Pairs</h3>
          <p>
            Add and organize your own <br />
            custom word pairs
          </p>
        </div>
        <div className={styles.feature}>
          <h3>Flexible Tag System</h3>
          <p>Filter words by language, topic, or anything you want</p>
        </div>
        <div className={styles.feature}>
          <h3>Interactive Learning</h3>
          <p>Reinforce memory through dynamic word-pair matching</p>
        </div>
        <div className={styles.feature}>
          <h3>100% Free</h3>
          <p>Created for personal use, shared to benefit all who may find it useful</p>
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

      {loading && <Spinner margin='3rem 0 0 0' />}
    </section>
  );
}

export default Welcome;
