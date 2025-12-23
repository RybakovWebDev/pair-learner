"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LazyMotion, m, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

import styles from "./EditWords.module.css";

import EditWordsHelp from "../EditWordsHelp";
import EditWordsSectionSwitcher from "../EditWordsSectionSwitch";
import EditWordsTagsSection from "../EditWordsTagsSection";
import EditWordsSearch from "../EditWordsSearch";
import EditWordsPair from "../EditWordsPair";
import Spinner from "../Spinner";

import { useUserContext } from "@/contexts/UserContext";
import { Pair, simpleFadeVariants, Tag } from "@/constants";
import EditWordsImport from "../EditWordsImport";
import EditWordsMainControlser from "../EditWordsMainControls";

const loadFeatures = () => import("../../featuresMax").then((res) => res.default);

const tagsUlVariants: Variants = {
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

function EditWords() {
  const { user, loading } = useUserContext();
  const router = useRouter();

  const [pairs, setPairs] = useState<(Pair & { tempId?: string })[]>([]);
  const [loadedPairs, setLoadedPairs] = useState<(Pair & { tempId?: string })[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tags, setTags] = useState<(Tag & { tempId?: string })[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [currentSection, setCurrentSection] = useState<"words" | "tags">("words");
  const [showContent, setShowContent] = useState(true);
  const [isAnimatingSections, setIsAnimatingSections] = useState(false);
  const [pendingSection, setPendingSection] = useState<"words" | "tags" | null>(null);
  const [shakeEditButton, setShakeEditButton] = useState<string | null>(null);
  const [isAddingNewPair, setIsAddingNewPair] = useState(false);
  const [editing, setEditing] = useState("");
  const [pairTagsOpened, setPairTagsOpened] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editedPair, setEditedPair] = useState<(Pair & { tempId?: string }) | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: { word1?: string; word2?: string; general?: string } }>({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [multipleSelection, setMultipleSelection] = useState(false);
  const [selectedPairs, setSelectedPairs] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState(false);

  const searchInputRef = useRef<HTMLDivElement>(null);

  const LIMIT = 30;

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const scrollToSearch = () => {
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 300);
  };

  const fetchAndUpdateData = useCallback(async () => {
    if (!user) return;
    try {
      const { count: totalCount, error: countError } = await supabase
        .from("word-pairs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) {
        console.error("Error fetching count:", countError);
        setFetchError(true);
        return;
      }

      setTotalCount(totalCount || 0);
      const { data: pairsData, error: pairsError } = await supabase
        .from("word-pairs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(0, LIMIT - 1);

      if (pairsError) {
        console.error("Error fetching word pairs:", pairsError);
        return;
      }

      const updatedPairsData = pairsData.map((pair: Pair) => ({
        ...pair,
        tempId: pair.id,
      }));

      setPairs(updatedPairsData);
      setLoadedPairs(updatedPairsData);
      setHasMore(pairsData.length === LIMIT);
      setOffset(LIMIT);

      const { data: tagsData, error: tagsError } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (tagsError) {
        console.error("Error fetching user tags:", tagsError);
        return;
      }

      const updatedTagsData = tagsData.map((tag: Tag) => ({
        ...tag,
        tempId: tag.id,
      }));

      setTags(updatedTagsData as (Tag & { tempId?: string })[]);

      fetchError && setFetchError(false);
    } catch (error) {
      console.error("Unexpected error:", error);
    }
    setDataLoaded(true);
    setTagsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && !dataLoaded) {
      fetchAndUpdateData();
    }
  }, [user, dataLoaded, fetchAndUpdateData]);

  const handleSectionChange = (section: "words" | "tags") => {
    if (section === currentSection || isAnimatingSections) return;

    setIsAnimatingSections(true);
    setShowContent(false);

    setPendingSection(section);

    setTimeout(() => {
      setCurrentSection(section);
      setTimeout(() => {
        setShowContent(true);
        setIsAnimatingSections(false);
        setPendingSection(null);
        setPairTagsOpened("");
        setEditing("");
        setEditedPair(null);
        if (multipleSelection) {
          setSelectedPairs([]);
          setMultipleSelection(false);
        }
      }, 50);
    }, 300);
  };

  useEffect(() => {
    setShowContent(false);

    const timer = setTimeout(() => {
      setShowContent(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [currentSection]);

  const handleMultipleSelection = () => {
    setMultipleSelection((prev) => !prev);
    if (multipleSelection) {
      setSelectedPairs([]);
    }
  };

  const handleMultipleDelete = useCallback(async () => {
    if (selectedPairs.length === 0 || !user) return;

    const pairsToDelete = pairs.filter((pair) => selectedPairs.includes(pair.id));

    const tempPairs = pairsToDelete.filter(
      (pair) => pair.id.startsWith("temp-") && (!pair.tempId || pair.tempId === pair.id)
    );
    const dbPairs = pairsToDelete.filter(
      (pair) => !pair.id.startsWith("temp-") || (pair.tempId && !pair.tempId.startsWith("temp-"))
    );

    setPairs((prevPairs) => prevPairs.filter((pair) => !selectedPairs.includes(pair.id)));
    setTotalCount(totalCount - pairsToDelete.length);

    if (tempPairs.length > 0 && tempPairs.some((p) => p.id === editedPair?.id)) {
      setIsAddingNewPair(false);
      setEditing("");
      setEditedPair(null);
    }

    if (dbPairs.length > 0) {
      const dbIds = dbPairs.map((pair) => (pair.tempId && !pair.tempId.startsWith("temp-") ? pair.tempId : pair.id));

      const { error } = await supabase.from("word-pairs").delete().in("id", dbIds);

      if (error) {
        console.error("Error deleting pairs:", error);
        setPairs((prevPairs) => [...prevPairs, ...dbPairs]);
        setTotalCount(totalCount);
      }
    }

    setSelectedPairs([]);
    setMultipleSelection(false);
  }, [selectedPairs, pairs, user, totalCount, editedPair]);

  const handleTogglePairSelection = useCallback((pairId: string) => {
    setSelectedPairs((prev) => {
      if (prev.includes(pairId)) {
        return prev.filter((id) => id !== pairId);
      } else {
        return [...prev, pairId];
      }
    });
  }, []);

  const handleAdd = async () => {
    if (!user || isAddingNewPair) return;

    if (editing && editedPair) {
      await handleEditSave(editedPair);
    }

    scrollToSearch();

    const tempId = "temp-" + Date.now();
    const newPair: Pair & { tempId: string } = {
      id: tempId,
      word1: "",
      word2: "",
      tag_ids: [],
      user_id: user.id,
      tempId: tempId,
    };

    setPairs((prevPairs) => [newPair, ...prevPairs]);
    clearAllErrors();
    setPairTagsOpened(tempId);
    setEditing(tempId);
    setEditedPair(newPair);
    setConfirmDelete("");
    setTotalCount(totalCount + 1);
    setIsAddingNewPair(true);
  };

  const handleEditSave = useCallback(
    async (pairToSave: Pair & { tempId?: string }) => {
      if (!user) return;

      const trimmedWord1 = pairToSave.word1.trim();
      const trimmedWord2 = pairToSave.word2.trim();

      if (trimmedWord1 === "" || trimmedWord2 === "") {
        setErrors({
          [pairToSave.id]: {
            word1: trimmedWord1 === "" ? "Word 1 cannot be empty" : undefined,
            word2: trimmedWord2 === "" ? "Word 2 cannot be empty" : undefined,
          },
        });
        return;
      }

      const { id, tempId, ...pairDataToSave } = pairToSave;
      const updatedPair = {
        ...pairDataToSave,
        word1: trimmedWord1,
        word2: trimmedWord2,
      };

      if (id.startsWith("temp-") && tempId?.startsWith("temp-")) {
        const { data, error } = await supabase.from("word-pairs").insert(updatedPair).select();

        if (error) {
          console.error("Error adding new pair:", error);
          setErrors({ [id]: { general: "Failed to add new pair. Please try again." } });
        } else if (data && data[0]) {
          setPairs((prevPairs) =>
            prevPairs.map((pair) => (pair.id === id ? { ...data[0], id: id, tempId: data[0].id } : pair))
          );
          clearAllErrors();

          scrollToSearch();
        }
      } else {
        const { error } = await supabase
          .from("word-pairs")
          .update(updatedPair)
          .eq("id", tempId || id);

        if (error) {
          console.error("Error updating pair:", error);
          setErrors({ [id]: { general: "Failed to update pair. Please try again." } });
        } else {
          setPairs((prevPairs) =>
            prevPairs.map((pair) => (pair.id === id ? { ...updatedPair, id, tempId: tempId || id } : pair))
          );
          clearAllErrors();
        }
      }

      setPairTagsOpened("");
      setEditing("");
      setEditedPair(null);
      setIsAddingNewPair(false);
    },
    [user, clearAllErrors]
  );

  const handleEditConfirm = useCallback(() => {
    if (!user || !editedPair) return;

    handleEditSave(editedPair);
  }, [user, editedPair, handleEditSave]);

  const handleEditStart = useCallback(
    (pair: Pair & { tempId?: string }) => {
      if (editing && editedPair) {
        if (editedPair.id.startsWith("temp-") && editedPair.tempId?.startsWith("temp-")) {
          setPairs((prevPairs) => prevPairs.filter((p) => p.id !== editedPair.id));
          setTotalCount(totalCount - 1);
          setIsAddingNewPair(false);
          setEditing(pair.id);
          setEditedPair({ ...pair, tag_ids: [...pair.tag_ids] });
          setPairTagsOpened((prev) => (prev !== pair.id ? pair.id : prev));
          setConfirmDelete("");
          clearAllErrors();
        } else {
          handleEditSave(editedPair).then(() => {
            setEditing(pair.id);
            setEditedPair({ ...pair, tag_ids: [...pair.tag_ids] });
            setPairTagsOpened((prev) => (prev !== pair.id ? pair.id : prev));
            setConfirmDelete("");
            clearAllErrors();
          });
        }
      } else {
        setEditing(pair.id);
        setEditedPair({ ...pair, tag_ids: [...pair.tag_ids] });
        setPairTagsOpened((prev) => (prev !== pair.id ? pair.id : prev));
        setConfirmDelete("");
        clearAllErrors();
      }
    },
    [editing, editedPair, handleEditSave, clearAllErrors, totalCount]
  );

  const handleEditCancel = useCallback(() => {
    if (editedPair) {
      if (editedPair.id.startsWith("temp-") && editedPair.tempId?.startsWith("temp-")) {
        setPairs((prevPairs) => prevPairs.filter((pair) => pair.id !== editedPair.id));
        setTotalCount(totalCount - 1);
      }
    }
    setEditing("");
    setEditedPair(null);
    setIsAddingNewPair(false);
  }, [editedPair, totalCount]);

  const handleDeleteStart = useCallback(
    (pair: Pair & { tempId?: string }) => {
      if (editing && editedPair) {
        if (editedPair.id.startsWith("temp-") && editedPair.tempId?.startsWith("temp-")) {
          setPairs((prevPairs) => prevPairs.filter((p) => p.id !== editedPair.id));
          setTotalCount(totalCount - 1);
          setIsAddingNewPair(false);
          setEditing("");
          setEditedPair(null);
        } else {
          handleEditSave(editedPair);
        }
      }
      setEditing("");
      clearAllErrors();
      setConfirmDelete(pair.id);
    },
    [editing, editedPair, handleEditSave, clearAllErrors, totalCount]
  );

  const handleConfirmDelete = useCallback(
    async (id: string) => {
      const pairToDelete = pairs.find((pair) => pair.id === id);

      if (!pairToDelete) {
        console.error("Pair not found for deletion");
        return;
      }

      setPairs((prevPairs) => prevPairs.filter((pair) => pair.id !== id));

      setSelectedPairs((prev) => prev.filter((pairId) => pairId !== id));

      if (id.startsWith("temp-") && (!pairToDelete.tempId || pairToDelete.tempId === id)) {
        setIsAddingNewPair(false);
        setConfirmDelete("");
        return;
      }

      const dbId =
        pairToDelete.tempId && !pairToDelete.tempId.startsWith("temp-") ? pairToDelete.tempId : pairToDelete.id;

      const { error } = await supabase.from("word-pairs").delete().eq("id", dbId);

      if (error) {
        console.error("Error deleting pair:", error);
        setErrors({ [id]: { general: "Failed to delete pair. Please try again." } });
        setPairs((prevPairs) => [...prevPairs, pairToDelete]);
      } else {
        setErrors({});
      }
      setTotalCount(totalCount - 1);
      setConfirmDelete("");
    },
    [pairs, totalCount]
  );

  const handleCancelDelete = () => {
    setConfirmDelete("");
  };

  const handleInputChange = (field: keyof Pair, value: string) => {
    if (editedPair) {
      setEditedPair({ ...editedPair, [field]: value });
      setErrors((prev) => ({
        ...prev,
        [editedPair.id]: { ...prev[editedPair.id], [field]: undefined },
      }));
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, field: "word1" | "word2") => {
      if (editing && editedPair) {
        if (e.key === "Enter" || e.key === "Return") {
          e.preventDefault();

          if (field === "word1") {
            const nextInput = document.getElementById(`word2-${editedPair.id}`);
            nextInput?.focus();
          } else {
            handleEditSave(editedPair);
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          handleEditCancel();
        }
      }
    },
    [editing, editedPair, handleEditSave, handleEditCancel]
  );

  const handleDisabledInputClick = useCallback(
    (e: React.MouseEvent, pairId: string) => {
      e.stopPropagation();
      if (editing !== pairId) {
        setShakeEditButton(pairId);
        setTimeout(() => setShakeEditButton(null), 500);
      }
    },
    [editing]
  );

  const handlePairTagsOpen = (pairId: string) => {
    setPairTagsOpened((prev) => (prev !== pairId ? pairId : ""));
  };

  const handleTagToggle = (pairId: string, tagId: string) => {
    const tag = tags.find((t) => t.id === tagId || t.tempId === tagId);
    const realTagId = tag?.tempId || tagId;

    if (editing === pairId && editedPair) {
      const updatedTagIds = editedPair.tag_ids.includes(realTagId)
        ? editedPair.tag_ids.filter((id) => id !== realTagId)
        : [...editedPair.tag_ids, realTagId];

      setEditedPair({ ...editedPair, tag_ids: updatedTagIds });
    } else {
      setShakeEditButton(pairId);
      setTimeout(() => setShakeEditButton(null), 500);
    }
  };

  const handleLoadMore = useCallback(async () => {
    if (!user || isSearching) return;

    try {
      const { data: pairsData, error: pairsError } = await supabase
        .from("word-pairs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + LIMIT - 1);

      if (pairsError) {
        console.error("Error fetching more pairs:", pairsError);
        return;
      }

      const updatedPairsData = pairsData.map((pair: Pair) => ({
        ...pair,
        tempId: pair.id,
      }));

      setPairs((prev) => [...prev, ...updatedPairsData]);
      setLoadedPairs((prev) => [...prev, ...updatedPairsData]);
      setHasMore(pairsData.length === LIMIT);
      setOffset((prev) => prev + LIMIT);
    } catch (error) {
      console.error("Error loading more pairs:", error);
    }
  }, [user, offset, isSearching]);

  if (!user) {
    return <Spinner />;
  }

  return (
    <LazyMotion features={loadFeatures}>
      <section className={styles.wrapperMain}>
        <div className={styles.introWrapper}>
          <h1>Word Editor</h1>

          <EditWordsHelp />

          <EditWordsImport
            user={user}
            tagsLoading={tagsLoading}
            isAddingNewPair={isAddingNewPair}
            searchQuery={searchQuery}
            isImporting={isImporting}
            setIsImporting={setIsImporting}
            setPairs={setPairs}
            scrollToSearch={scrollToSearch}
          />
        </div>

        <EditWordsSectionSwitcher
          currentSection={isAnimatingSections && pendingSection ? pendingSection : currentSection}
          onSectionChange={handleSectionChange}
        />

        <AnimatePresence mode='popLayout'>
          {currentSection === "tags" ? (
            <m.div
              className={styles.sectionWrapper}
              key='tags-section'
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EditWordsTagsSection
                user={user}
                tags={tags}
                setTags={setTags}
                pairs={pairs}
                setPairs={setPairs}
                tagsLoading={tagsLoading}
              />
            </m.div>
          ) : (
            <m.div
              className={styles.sectionWrapper}
              key='words-section'
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {showContent && (
                <>
                  <m.div
                    className={styles.mainControlsWrapper}
                    variants={simpleFadeVariants}
                    initial='hidden'
                    animate='show'
                  >
                    <EditWordsSearch
                      user={user}
                      tagsLoading={tagsLoading}
                      isImporting={isImporting}
                      isSearching={isSearching}
                      setIsSearching={setIsSearching}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      setPairs={setPairs}
                      loadedPairs={loadedPairs}
                      setHasMore={setHasMore}
                      offset={offset}
                      searchInputRef={searchInputRef}
                    />

                    {!isSearching && (
                      <EditWordsMainControlser
                        isAddingNewPair={isAddingNewPair}
                        tagsLoading={tagsLoading}
                        isImporting={isImporting}
                        searchQuery={searchQuery}
                        user={user}
                        multipleSelection={multipleSelection}
                        selectedPairs={selectedPairs}
                        handleMultipleSelection={handleMultipleSelection}
                        handleAdd={handleAdd}
                        handleMultipleDelete={handleMultipleDelete}
                      />
                    )}
                  </m.div>

                  {errors.new?.general && <p className={styles.errorMessage}>{errors.new.general}</p>}

                  {user ? (
                    <>
                      {fetchError ? (
                        <m.div className={styles.errorWrapper} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <p className={styles.errorMessage}>
                            Failed to load your data. Please check your connection and try again.
                          </p>
                          <button
                            className={styles.retryButton}
                            onClick={() => {
                              setFetchError(false);
                              setTagsLoading(true);
                              fetchAndUpdateData();
                            }}
                          >
                            Retry
                          </button>
                        </m.div>
                      ) : tagsLoading ? (
                        <Spinner />
                      ) : isSearching ? (
                        <Spinner />
                      ) : pairs.length > 0 ? (
                        <m.ul className={styles.list} layout>
                          <AnimatePresence>
                            {pairs.map((p, index) => (
                              <EditWordsPair
                                key={p.id}
                                pair={p}
                                index={index}
                                totalCount={totalCount}
                                searchQuery={searchQuery}
                                tags={tags}
                                editing={editing}
                                editedPair={editedPair}
                                shakeEditButton={shakeEditButton}
                                pairTagsOpened={pairTagsOpened}
                                confirmDelete={confirmDelete}
                                errors={errors}
                                tagsUlVariants={tagsUlVariants}
                                controlsVariants={controlsVariants}
                                onEditStart={handleEditStart}
                                onEditConfirm={handleEditConfirm}
                                onEditCancel={handleEditCancel}
                                onDeleteStart={handleDeleteStart}
                                onDeleteConfirm={handleConfirmDelete}
                                onDeleteCancel={handleCancelDelete}
                                onPairTagsOpen={handlePairTagsOpen}
                                onTagToggle={handleTagToggle}
                                onInputChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                onDisabledInputClick={handleDisabledInputClick}
                                multipleSelection={multipleSelection}
                                isSelected={selectedPairs.includes(p.id)}
                                onToggleSelection={() => handleTogglePairSelection(p.id)}
                              />
                            ))}
                          </AnimatePresence>
                        </m.ul>
                      ) : tagsLoading ? (
                        <Spinner />
                      ) : (
                        <m.p
                          className={pairs.length !== 0 ? styles.noResultsMessage : styles.noPairsMessage}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {loadedPairs.length === 0 ? "No word pairs yet." : "No word pairs match your search."}
                        </m.p>
                      )}
                      {!tagsLoading && !searchQuery && hasMore && (
                        <m.button
                          className={styles.loadMoreButton}
                          initial={{ backgroundColor: "var(--color-background)" }}
                          animate={{ opacity: isAddingNewPair || isSearching ? 0.5 : 1 }}
                          style={{ pointerEvents: isAddingNewPair || isSearching ? "none" : "auto" }}
                          whileTap={
                            user && !isAddingNewPair ? { backgroundColor: "var(--color-background-highlight)" } : {}
                          }
                          onClick={handleLoadMore}
                          disabled={!user || tagsLoading || isAddingNewPair || isSearching}
                        >
                          <p>Load more pairs</p>
                          {isSearching && <Spinner height='20px' width='20px' borderWidth='2px' />}
                        </m.button>
                      )}
                    </>
                  ) : (
                    <Spinner />
                  )}
                </>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </section>
    </LazyMotion>
  );
}

export default EditWords;
