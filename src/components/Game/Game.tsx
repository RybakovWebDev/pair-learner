"use client";
import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { LazyMotion, m, Variants, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

import styles from "./Game.module.css";

import PairList from "../PairList";
import Spinner from "../Spinner";
import GameTagFilter from "../GameTagFilter";
import GameRowCountSelector from "../GameRowCountSelector";
import GameRoundLengthSelector from "../GameRoundLengthSelector";

import { useUserContext } from "@/contexts/UserContext";
import { controlsVariants, Pair, rowCountOptions, simpleFadeVariants, Tag } from "@/constants";
import { AnimateChangeInHeight, formatTime } from "@/utils/helpers";
import GameToggles from "../GameToggles";

const loadFeatures = () => import("../../featuresMax").then((res) => res.default);

interface PairListProps {
  numPairs: number;
  isGameRunning: boolean;
  refreshTrigger: number;
  pairs: Pair[];
  endlessMode: boolean;
  showSparkles: boolean;
  mixColumns: boolean;
}

type GameState = {
  isLoading: boolean;
  pairs: Pair[];
  tags: Tag[];
  rowCount: number;
  tagsOpen: boolean;
  enabledTags: string[];
  roundLength: number;
  isGameRunning: boolean;
  timeRemaining: number;
  refreshTrigger: number;
  solvedPairs: number;
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

function gameReducer(state: GameState, action: any): GameState {
  switch (action.type) {
    case "INITIALIZE_DATA":
      return {
        ...state,
        isLoading: false,
        pairs: action.payload.pairs,
        tags: action.payload.tags,
      };
    case "SET_ROW_COUNT":
      return { ...state, rowCount: action.payload };
    case "SET_TAGS_OPEN":
      return { ...state, tagsOpen: action.payload };
    case "SET_ENABLED_TAGS":
      return { ...state, enabledTags: action.payload };
    case "SET_ROUND_LENGTH":
      return { ...state, roundLength: action.payload, timeRemaining: action.payload };
    case "SET_GAME_RUNNING":
      return {
        ...state,
        isGameRunning: action.payload,
        timeRemaining: action.payload ? state.roundLength : state.timeRemaining,
      };
    case "SET_TIME_REMAINING":
      return { ...state, timeRemaining: action.payload };
    case "REFRESH_TRIGGER":
      return { ...state, refreshTrigger: state.refreshTrigger + 1 };
    case "INCREMENT_SOLVED_PAIRS":
      return { ...state, solvedPairs: state.solvedPairs + 1 };
    case "RESET_SOLVED_PAIRS":
      return { ...state, solvedPairs: 0 };
    default:
      return state;
  }
}

function Game() {
  const { user, loading: userLoading } = useUserContext();
  const [state, dispatch] = useReducer(gameReducer, {
    isLoading: true,
    pairs: [],
    tags: [],
    rowCount: 5,
    tagsOpen: false,
    enabledTags: [],
    roundLength: 210,
    isGameRunning: false,
    timeRemaining: 210,
    refreshTrigger: 0,
    solvedPairs: 0,
  });
  const [showSparkles, setShowSparkles] = useState(true);
  const [endlessMode, setEndlessMode] = useState(false);
  const [mixColumns, setMixColumns] = useState(false);

  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchDataRef = useRef(false);

  const filteredPairs = useMemo(() => {
    if (state.enabledTags.length === 0) return state.pairs;
    return state.pairs.filter((pair) => pair.tag_ids.some((tagId) => state.enabledTags.includes(tagId)));
  }, [state.pairs, state.enabledTags]);

  const fetchData = useCallback(async () => {
    if (!user || fetchDataRef.current) return;
    fetchDataRef.current = true;
    try {
      const [pairsResponse, tagsResponse] = await Promise.all([
        supabase.from("word-pairs").select("*").eq("user_id", user.id),
        supabase.from("tags").select("*").eq("user_id", user.id),
      ]);

      if (pairsResponse.error || tagsResponse.error) {
        console.error("Error fetching data:", pairsResponse.error || tagsResponse.error);
      } else {
        dispatch({
          type: "INITIALIZE_DATA",
          payload: { pairs: pairsResponse.data, tags: tagsResponse.data },
        });
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/");
    } else if (!userLoading && user) {
      fetchData();
    }
  }, [user, userLoading, router, fetchData]);

  useEffect(() => {
    if (!userLoading && user && state.pairs.length === 0) {
      fetchData();
    }
  }, [userLoading, user, state.pairs.length, fetchData]);

  useEffect(() => {
    dispatch({ type: "SET_NOT_ENOUGH_PAIRS", payload: filteredPairs.length < 5 });
  }, [filteredPairs]);

  useEffect(() => {
    if (state.isGameRunning && state.roundLength !== 210) {
      timerRef.current = setInterval(() => {
        dispatch({
          type: "SET_TIME_REMAINING",
          payload: Math.max(0, state.timeRemaining - 1),
        });

        if (state.timeRemaining <= 1) {
          clearInterval(timerRef.current!);
          dispatch({ type: "SET_GAME_RUNNING", payload: false });
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current!);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isGameRunning, state.roundLength, state.timeRemaining]);

  const handleRowCountChange = useCallback(
    (rows: number) => {
      if (!state.isGameRunning) {
        dispatch({ type: "SET_ROW_COUNT", payload: rows });
      }
    },
    [state.isGameRunning]
  );

  const handleTagsOpen = useCallback(() => {
    if (!state.isGameRunning) {
      dispatch({ type: "SET_TAGS_OPEN", payload: !state.tagsOpen });
    }
  }, [state.isGameRunning, state.tagsOpen]);

  const handleTagsChange = useCallback(
    (tagId: string) => {
      if (!state.isGameRunning) {
        dispatch({
          type: "SET_ENABLED_TAGS",
          payload: state.enabledTags.includes(tagId)
            ? state.enabledTags.filter((id) => id !== tagId)
            : [...state.enabledTags, tagId],
        });
      }
    },
    [state.isGameRunning, state.enabledTags]
  );

  const handleRoundLengthChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!state.isGameRunning) {
        const newLength = Number(event.target.value);
        dispatch({ type: "SET_ROUND_LENGTH", payload: newLength });
      }
    },
    [state.isGameRunning]
  );

  const handleSparklesToggle = useCallback(() => {
    setShowSparkles((prev) => !prev);
  }, []);

  const handleEndlessToggle = useCallback(() => {
    setEndlessMode((prev) => !prev);
    dispatch({ type: "REFRESH_TRIGGER" });
  }, []);

  const handleMixToggle = useCallback(() => {
    setMixColumns((prev) => !prev);
    dispatch({ type: "REFRESH_TRIGGER" });
  }, []);

  const handlePairSolved = useCallback(() => {
    dispatch({ type: "INCREMENT_SOLVED_PAIRS" });
  }, []);

  const handleStart = useCallback(() => {
    if (state.isGameRunning) {
      dispatch({ type: "RESET_SOLVED_PAIRS" });
    }
    dispatch({ type: "SET_GAME_RUNNING", payload: !state.isGameRunning });
  }, [state.isGameRunning]);

  const handleRefresh = useCallback(() => {
    if (!state.isGameRunning) {
      dispatch({ type: "REFRESH_TRIGGER" });
    }
  }, [state.isGameRunning]);

  const MemoizedPairListWrapper = useMemo(() => {
    const MemoizedComponent = memo<PairListProps>(
      ({ numPairs, isGameRunning, refreshTrigger, pairs, endlessMode, showSparkles, mixColumns }) => {
        return (
          <PairList
            numPairs={numPairs}
            isGameRunning={isGameRunning}
            refreshTrigger={refreshTrigger}
            pairs={pairs}
            onPairSolved={handlePairSolved}
            endlessMode={endlessMode}
            showSparkles={showSparkles}
            mixColumns={mixColumns}
          />
        );
      }
    );
    MemoizedComponent.displayName = "MemoizedPairListWrapper";
    return MemoizedComponent;
  }, [handlePairSolved]);

  const areControlsDisabled = state.isGameRunning || filteredPairs.length < 5;

  if (userLoading || state.isLoading) {
    return <Spinner margin='5vh 0 0 0' borderWidth='3px' />;
  }

  return (
    <LazyMotion features={loadFeatures}>
      <m.section className={styles.wrapperMain} initial='hidden' animate='show' variants={simpleFadeVariants}>
        <AnimateChangeInHeight>
          {state.isLoading ? (
            <div className={styles.spinnerWrapper}>
              <Spinner margin='11rem 0 0 0' />
            </div>
          ) : filteredPairs.length < 5 ? (
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
            <MemoizedPairListWrapper
              numPairs={state.rowCount}
              isGameRunning={state.isGameRunning}
              refreshTrigger={state.refreshTrigger}
              pairs={filteredPairs}
              endlessMode={endlessMode}
              showSparkles={showSparkles}
              mixColumns={mixColumns}
            />
          )}
        </AnimateChangeInHeight>

        <AnimateChangeInHeight>
          <AnimatePresence>
            {state.isGameRunning && state.roundLength !== 210 && (
              <m.div
                className={styles.timerWrapper}
                key={"timer"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <m.p>{formatTime(state.timeRemaining)}</m.p>
              </m.div>
            )}
          </AnimatePresence>
        </AnimateChangeInHeight>

        <AnimateChangeInHeight>
          <AnimatePresence>
            {state.isGameRunning && (
              <m.div
                className={styles.solvedWrapper}
                key={`solvedCount`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <m.p>Solved pairs:</m.p>
                <m.p>{state.solvedPairs}</m.p>
              </m.div>
            )}
          </AnimatePresence>
        </AnimateChangeInHeight>

        <m.div className={styles.controlsWrapper}>
          <m.div
            className={styles.startWrapper}
            variants={controlsVariants}
            animate={filteredPairs.length < 5 ? "disabled" : "enabled"}
          >
            <button onClick={handleStart} disabled={filteredPairs.length < 5}>
              <AnimatePresence mode='wait' initial={false}>
                {state.isGameRunning ? (
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

          <m.button
            disabled={filteredPairs.length < 5}
            className={styles.resetButton}
            onClick={handleRefresh}
            variants={controlsVariants}
            initial={{ backgroundColor: "var(--color-background)" }}
            animate={state.isGameRunning || filteredPairs.length < 5 ? "disabled" : "enabled"}
            whileTap={{
              backgroundColor: "var(--color-background-highlight)",
            }}
          >
            Refresh list
          </m.button>

          <GameTagFilter
            tags={state.tags}
            enabledTags={state.enabledTags}
            isOpen={state.tagsOpen}
            isDisabled={state.isGameRunning}
            onToggleOpen={handleTagsOpen}
            onTagChange={handleTagsChange}
          />

          <GameRowCountSelector
            rowCount={state.rowCount}
            rowCountOptions={rowCountOptions}
            isDisabled={areControlsDisabled}
            onRowCountChange={handleRowCountChange}
          />

          <GameRoundLengthSelector
            roundLength={state.roundLength}
            isDisabled={areControlsDisabled}
            onChange={handleRoundLengthChange}
          />

          <GameToggles
            showSparkles={showSparkles}
            onSparklesToggle={handleSparklesToggle}
            endless={endlessMode}
            onEndlessToggle={handleEndlessToggle}
            mixColumns={mixColumns}
            onMixToggle={handleMixToggle}
            isDisabled={areControlsDisabled}
          />
        </m.div>
      </m.section>
    </LazyMotion>
  );
}

export default Game;
