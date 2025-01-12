"use client";
import { useRef, useState } from "react";
import { LazyMotion, m, useInView } from "framer-motion";
import { Bookmark, Heart, Settings, Upload } from "react-feather";

import styles from "./Welcome.module.css";

import Spinner from "../Spinner";
import Auth from "../Auth";
import PairList from "../PairList";
import Toggle from "../Toggle";

import { useUserContext } from "@/contexts/UserContext";
import { DEMO_PAIRS_EMOJI } from "@/constants";

const loadFeatures = () => import("../../features").then((res) => res.default);

function Welcome() {
  const { user, loading } = useUserContext();
  const [endless, setEndless] = useState(false);

  const featuresRef = useRef(null);
  const featuresInView = useInView(featuresRef, { amount: 0.7, once: true });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: featuresInView ? 1 : 0,
      transition: {
        staggerChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: featuresInView ? 1 : 0, y: featuresInView ? 0 : 20 },
  };

  return (
    <section className={styles.mainWrapper}>
      <section className={styles.hero}>
        <h1>
          Learn{" "}
          <LazyMotion features={loadFeatures}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <m.span>anything</m.span>
              <LazyMotion features={loadFeatures}>
                <m.div
                  className={styles.spanBorder}
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{
                    delay: 0.3,
                    type: "spring",
                    bounce: 0.1,
                    duration: 1.2,
                  }}
                />
              </LazyMotion>
            </div>{" "}
          </LazyMotion>
          <br /> with customizable <br /> word pairs
        </h1>
      </section>

      <div className={styles.pairsWrapper}>
        <PairList pairs={DEMO_PAIRS_EMOJI} isGameRunning emojis endlessMode={endless} />
      </div>

      <Toggle column={true} labelText='Endless mode' checked={endless} onChange={() => setEndless(!endless)} />

      <LazyMotion features={loadFeatures}>
        <m.ul className={styles.features} variants={container} initial='hidden' animate='show'>
          <m.li ref={featuresRef} className={styles.feature} variants={item}>
            <Settings color='hsl(0 0% 92%)' size={25} />
            <h2>Customization</h2>
            <p>Add and organize your own custom word pairs in any language</p>
          </m.li>
          <m.li className={styles.feature} variants={item}>
            <Bookmark color='hsl(0 0% 92%)' size={25} />
            <h2>Flexible Tag System</h2>
            <p>Filter words by language, topic, or anything you want</p>
          </m.li>
          <m.li className={styles.feature} variants={item}>
            <Upload color='hsl(0 0% 92%)' size={25} />
            <h2>Easy Word Import</h2>
            <p>Quickly import lists of word pairs from CSV or Excel files</p>
          </m.li>
          {/*  <m.li className={styles.feature} variants={item}>
          <GitBranch color='hsl(0 0% 92%)' size={25} />
          <h2>Memory Game</h2>
          <p>Learn anything through an engaging word-matching game</p>
          </m.li> */}
          <m.li className={styles.feature} variants={item}>
            <Heart color='hsl(0 0% 92%)' size={25} />
            <h2>100% Free</h2>
            <p>A learning tool born from personal need, available to everyone</p>
          </m.li>
        </m.ul>
      </LazyMotion>

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
