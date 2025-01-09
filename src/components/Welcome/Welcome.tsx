"use client";
import { useState } from "react";

import styles from "./Welcome.module.css";

import Spinner from "../Spinner";
import Auth from "../Auth";
import PairList from "../PairList";
import Toggle from "../Toggle";

import { useUserContext } from "@/contexts/UserContext";
import { DEMO_PAIRS_EMOJI } from "@/constants";
import { Bookmark, Heart, Settings, Upload } from "react-feather";

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
          <Settings color='hsl(0 0% 92%)' size={25} />
          <h2>Customization</h2>
          <p>Add and organize your own custom word pairs in any language</p>
        </li>
        <li className={styles.feature}>
          <Bookmark color='hsl(0 0% 92%)' size={25} />
          <h2>Flexible Tag System</h2>
          <p>Filter words by language, topic, or anything you want</p>
        </li>
        <li className={styles.feature}>
          <Upload color='hsl(0 0% 92%)' size={25} />
          <h2>Easy Word Import</h2>
          <p>Quickly import lists of word pairs from CSV or Excel files</p>
        </li>
        {/* <li className={styles.feature}>
          <GitBranch color='hsl(0 0% 92%)' size={25} />
          <h2>Memory Game</h2>
          <p>Learn anything through an engaging word-matching game</p>
        </li> */}
        <li className={styles.feature}>
          <Heart color='hsl(0 0% 92%)' size={25} />
          <h2>100% Free</h2>
          <p>A learning tool born from personal need, available to everyone</p>
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
