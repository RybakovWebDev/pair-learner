"use client";
import { useState } from "react";

import styles from "./Welcome.module.css";

import Spinner from "../Spinner";
import Auth from "../Auth";
import PairList from "../PairList";
import Toggle from "../Toggle";

import { useUserContext } from "@/contexts/UserContext";
import { DEMO_PAIRS_EMOJI } from "@/constants";

function Welcome() {
  const { user, loading } = useUserContext();
  const [endless, setEndless] = useState(false);

  return (
    <section className={styles.mainWrapper}>
      <section className={styles.hero}>
        <h1>
          Learn <span>anything</span> <br /> with customizable <br /> word pairs
        </h1>
      </section>

      <div className={styles.pairsWrapper}>
        <PairList pairs={DEMO_PAIRS_EMOJI} isGameRunning emojis endlessMode={endless} />
      </div>

      <Toggle column={true} labelText='Endless mode' checked={endless} onChange={() => setEndless(!endless)} />

      <ul className={styles.features}>
        <li className={styles.feature}>
          <h2>Custom Word Pairs</h2>
          <p>
            Add and organize your own <br />
            custom word pairs
          </p>
        </li>
        <li className={styles.feature}>
          <h2>Flexible Tag System</h2>
          <p>Filter words by language, topic, or anything you want</p>
        </li>
        <li className={styles.feature}>
          <h2>Interactive Learning</h2>
          <p>Reinforce memory through dynamic word-pair matching</p>
        </li>
        <li className={styles.feature}>
          <h2>100% Free</h2>
          <p>Created for personal use, shared to benefit all who may find it useful</p>
        </li>
      </ul>

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
