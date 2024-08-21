"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { LazyMotion, m, Variants, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import styles from "./Game.module.css";

import { Check, ChevronDown } from "react-feather";
import PairList from "../PairList";

import { useUserContext } from "@/contexts/UserContext";
import { Pair, rowCountOptions, UserCategory } from "@/constants";
import { AnimateChangeInHeight } from "@/helpers";

const loadFeatures = () => import("../../featuresMax").then((res) => res.default);

const simpleVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
  },
};

const categoriesUlVariants: Variants = {
  hidden: {
    height: 0,
  },
  show: {
    height: "auto",
  },
  exit: {
    height: 0,
  },
};

const startVariants: Variants = {
  hidden: { opacity: 0, scale: 1.2 },
  show: {
    opacity: 1,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
  },
};

const controlsVariants: Variants = {
  enabled: {
    opacity: 1,
    pointerEvents: "auto" as const,
  },
  disabled: {
    opacity: 0.5,
    pointerEvents: "none" as const,
  },
};

function Game() {
  const { user, loading } = useUserContext();
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState(5);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [enabledCategories, setEnabledCategories] = useState<string[]>([]);
  const [roundLength, setRoundLength] = useState(210);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(210);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notEnoughPairs, setNotEnoughPairs] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const isControlsDisabled = useMemo(() => isGameRunning || notEnoughPairs, [isGameRunning, notEnoughPairs]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const id = useId();

  const fetchWordPairs = useCallback(async () => {
    if (!user) return;

    const localPairs = localStorage.getItem("pairs");
    if (localPairs) {
      setPairs(JSON.parse(localPairs));
    } else {
      try {
        const { data, error } = await supabase.from("word-pairs").select("*").eq("user_id", user.id);
        if (error) {
          console.error("Error fetching word pairs:", error);
        } else {
          setPairs(data as Pair[]);
          localStorage.setItem("pairs", JSON.stringify(data));
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      }
    }
  }, [user]);

  const fetchUserCategories = useCallback(async () => {
    if (!user) return;

    const localCategories = localStorage.getItem("categories");
    if (localCategories) {
      const parsedCategories = JSON.parse(localCategories);
      setCategories([...parsedCategories.map((c: UserCategory) => c.category), "None"]);
      setEnabledCategories([...parsedCategories.map((c: UserCategory) => c.category), "None"]);
    } else {
      const { data, error } = await supabase.from("pair-categories").select("*").eq("user_id", user.id);
      if (error) {
        console.error("Error fetching user categories:", error);
      } else {
        const categoryNames = [...data.map((c) => c.category), "None"];
        setCategories(categoryNames);
        setEnabledCategories(categoryNames);
        localStorage.setItem("categories", JSON.stringify(data));
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchWordPairs();
      fetchUserCategories();
    }
  }, [user, fetchWordPairs, fetchUserCategories]);

  useEffect(() => {
    if (isGameRunning && roundLength !== 210) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current!);
            setIsGameRunning(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current!);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameRunning, roundLength]);

  useEffect(() => {
    setTimeRemaining(roundLength);
  }, [roundLength]);

  const getFilteredPairs = useCallback(() => {
    return pairs.filter((pair) => {
      if (pair.category && enabledCategories.includes(pair.category)) {
        return true;
      }
      if (!pair.category && enabledCategories.includes("None")) {
        return true;
      }
      return false;
    });
  }, [pairs, enabledCategories]);

  const filteredPairs = useMemo(() => getFilteredPairs(), [getFilteredPairs]);

  useEffect(() => {
    setNotEnoughPairs(filteredPairs.length < 5);
  }, [filteredPairs]);

  const handleRowCountChange = (rows: number) => {
    if (!isGameRunning) {
      setRowCount(rows);
    }
  };

  const handleCategoriesOpen = () => {
    if (!isGameRunning) {
      setCategoriesOpen(!categoriesOpen);
    }
  };

  const handleCategoriesChange = (category: string) => {
    if (!isGameRunning) {
      setEnabledCategories((prevCategories) => {
        if (prevCategories.includes(category)) {
          if (prevCategories.length === 1) {
            return prevCategories;
          }
          return prevCategories.filter((c) => c !== category);
        } else {
          return [...prevCategories, category];
        }
      });
    }
  };

  const handleRoundLengthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isGameRunning) {
      const newLength = Number(event.target.value);
      setRoundLength(newLength);
      setTimeRemaining(newLength);
    }
  };

  const handleStart = () => {
    setIsGameRunning(!isGameRunning);
  };

  const handleRefresh = () => {
    if (!isGameRunning) {
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <LazyMotion features={loadFeatures}>
      <m.section className={styles.wrapperMain} initial='hidden' animate='show' variants={simpleVariants}>
        <m.div className={styles.controlsWrapper}>
          <m.div
            className={styles.categoriesWrapper}
            variants={controlsVariants}
            animate={isGameRunning ? "disabled" : "enabled"}
          >
            <div className={styles.categoriesLabelWrapper} onClick={handleCategoriesOpen}>
              <p>Words to use:</p>
              <AnimatePresence mode='wait'>
                <m.p
                  key={categories.length === enabledCategories.length ? "All" : "Custom"}
                  className={styles.categoriesSelection}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {categories.length === enabledCategories.length ? "All" : "Custom"}
                </m.p>
              </AnimatePresence>
              <m.div initial={{ rotate: 0 }} animate={{ rotate: categoriesOpen ? 180 : 0 }}>
                <ChevronDown />
              </m.div>
            </div>

            <AnimatePresence>
              {categoriesOpen && (
                <m.ul initial='hidden' animate='show' exit='hidden' variants={categoriesUlVariants}>
                  {categories.map((c, i) => {
                    return (
                      <li key={c + i} value={c}>
                        <m.div className={styles.checkWrapperOuter}>
                          <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: enabledCategories.includes(c) ? 1 : 0 }}
                            onClick={() => handleCategoriesChange(c)}
                          >
                            <Check />
                          </m.div>
                        </m.div>
                        <p>{c}</p>
                      </li>
                    );
                  })}
                </m.ul>
              )}
            </AnimatePresence>
          </m.div>

          <m.div
            className={styles.rowCountWrapper}
            variants={controlsVariants}
            animate={isControlsDisabled ? "disabled" : "enabled"}
          >
            <label htmlFor='row-count-select'>Number of rows:</label>

            <div className={styles.rowsSelector}>
              {rowCountOptions.map((r) => {
                return (
                  <button key={r} onClick={() => handleRowCountChange(r)}>
                    <h3>{r}</h3>
                    <AnimatePresence>
                      {rowCount === r ? (
                        <m.div
                          className={styles.hovered}
                          layoutId={id}
                          initial={{ opacity: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
                          animate={{
                            opacity: 1,
                            borderTopLeftRadius: rowCount === 3 ? 15 : 0,
                            borderTopRightRadius: rowCount === 5 ? 15 : 0,
                          }}
                          exit={{ opacity: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
                          transition={{ type: "spring", damping: 70, stiffness: 1000 }}
                        />
                      ) : null}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          </m.div>

          <m.div
            className={styles.roundLengthWrapper}
            variants={controlsVariants}
            animate={isControlsDisabled ? "disabled" : "enabled"}
          >
            <label htmlFor='length'>Round length:</label>

            <div className={styles.roundLengthSecondsWrapper}>
              <AnimatePresence mode='wait' initial={false}>
                {roundLength !== 210 ? (
                  <m.div
                    key='seconds-wrapper'
                    initial={{ opacity: 0, y: "-100%" }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: "100%" }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={styles.secondsCountWrapper}>
                      <AnimatePresence mode='wait'>
                        <m.p
                          className={styles.roundLengthSeconds}
                          key={roundLength}
                          initial={{ opacity: 0, y: "-100%" }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: "100%" }}
                          transition={{ duration: 0.2 }}
                        >
                          {roundLength}
                        </m.p>
                      </AnimatePresence>
                    </div>
                    <p>seconds</p>
                  </m.div>
                ) : (
                  <m.p
                    className={styles.roundLengthInfinite}
                    key='infinite'
                    initial={{ opacity: 0, y: "-100%" }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: "100%" }}
                    transition={{ duration: 0.2 }}
                  >
                    Infinite
                  </m.p>
                )}
              </AnimatePresence>
            </div>

            <input
              type='range'
              id='length'
              name='length'
              min='30'
              max='210'
              step='30'
              value={roundLength}
              onChange={handleRoundLengthChange}
            />
          </m.div>

          <m.div
            className={styles.startWrapper}
            variants={controlsVariants}
            animate={notEnoughPairs ? "disabled" : "enabled"}
          >
            <button onClick={handleStart} disabled={notEnoughPairs || isGameRunning}>
              <AnimatePresence mode='wait' initial={false}>
                {isGameRunning ? (
                  <m.p key={"stop"} initial='hidden' animate='show' exit='exit' variants={startVariants}>
                    Stop
                  </m.p>
                ) : (
                  <m.p key={"start"} initial='hidden' animate='show' exit='exit' variants={startVariants}>
                    Start
                  </m.p>
                )}
              </AnimatePresence>
            </button>
          </m.div>
        </m.div>

        <AnimateChangeInHeight className={styles.timerWrapper}>
          <AnimatePresence>
            {roundLength !== 210 && (
              <m.div key={"timer"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <m.p>{formatTime(timeRemaining)}</m.p>
              </m.div>
            )}
          </AnimatePresence>
        </AnimateChangeInHeight>

        <AnimateChangeInHeight>
          {notEnoughPairs ? (
            <m.div
              className={styles.minPairsMessage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p>You need to add at least 5 word pairs to play the game.</p>
              <Link href={"/edit"}>
                <p>Add more?</p>
                <span />
              </Link>
            </m.div>
          ) : (
            <PairList
              numPairs={rowCount}
              isGameRunning={isGameRunning}
              refreshTrigger={refreshTrigger}
              pairs={filteredPairs}
            />
          )}
        </AnimateChangeInHeight>

        <m.button
          className={styles.resetButton}
          onClick={handleRefresh}
          variants={controlsVariants}
          animate={isGameRunning ? "disabled" : "enabled"}
        >
          Refresh list
        </m.button>
      </m.section>
    </LazyMotion>
  );
}

export default Game;
