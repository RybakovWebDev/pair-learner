"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, LazyMotion, m, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import styles from "./EditWords.module.css";

import { Check, Edit, Plus, Search, Trash2, X } from "react-feather";
import Spinner from "../Spinner";

import { useUserContext } from "@/contexts/UserContext";
import { Pair, UserCategory } from "@/constants";
import { AnimateChangeInHeight } from "@/helpers";

const loadFeatures = () => import("../../featuresMax").then((res) => res.default);

const simpleVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
};

function EditWords() {
  const { user, loading } = useUserContext();
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [enabledCategories, setEnabledCategories] = useState<string[]>([]);
  const [shakeEditButton, setShakeEditButton] = useState<string | null>(null);
  const [editing, setEditing] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editedPair, setEditedPair] = useState<Pair | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: { word1?: string; word2?: string; general?: string } }>({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const router = useRouter();

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const fetchWordPairs = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("word-pairs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching word pairs:", error);
      } else {
        setPairs(data as Pair[]);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
    setDataLoaded(true);
  }, [user]);

  const fetchUserCategories = useCallback(async () => {
    if (!user) return;

    setCategoriesLoading(true);
    try {
      const { data, error } = await supabase.from("pair-categories").select("*").eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user categories:", error);
      } else {
        setUserCategories(data);
        setEnabledCategories([...data.map((c) => c.category), "None"]);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
    setCategoriesLoading(false);
  }, [user]);

  useEffect(() => {
    if (user && !dataLoaded) {
      fetchWordPairs();
      fetchUserCategories();
    }
  }, [user, dataLoaded, fetchWordPairs, fetchUserCategories]);

  const updateCategories = useCallback(
    async (updatedPairs: Pair[]) => {
      if (!user) return;

      const categories = new Set(updatedPairs.map((p) => p.category).filter(Boolean));
      const categoriesArray = Array.from(categories) as string[];

      const currentCategories = userCategories.map((c) => c.category);
      const newCategories = categoriesArray.filter((c) => !currentCategories.includes(c));
      const categoriesToRemove = currentCategories.filter((c) => !categoriesArray.includes(c));

      if (newCategories.length > 0 || categoriesToRemove.length > 0) {
        let updatedCategories = [...userCategories];

        if (newCategories.length > 0) {
          const { data, error: insertError } = await supabase
            .from("pair-categories")
            .insert(newCategories.map((category) => ({ user_id: user.id, category })))
            .select();

          if (insertError) {
            console.error("Error inserting new categories:", insertError);
          } else if (data) {
            updatedCategories = [...updatedCategories, ...data];
          }
        }

        if (categoriesToRemove.length > 0) {
          const { error: deleteError } = await supabase
            .from("pair-categories")
            .delete()
            .eq("user_id", user.id)
            .in("category", categoriesToRemove);

          if (deleteError) {
            console.error("Error deleting unused categories:", deleteError);
          } else {
            updatedCategories = updatedCategories.filter((c) => !categoriesToRemove.includes(c.category));
          }
        }

        setUserCategories(updatedCategories);
        setEnabledCategories([...updatedCategories.map((c) => c.category), "None"]);
      }
    },
    [user, userCategories]
  );

  const handleAdd = async () => {
    if (!user) return;

    const newPair: Omit<Pair, "id" | "created_at"> = {
      word1: "Word 1",
      word2: "Word 2",
      category: null,
      user_id: user.id,
    };

    const { data, error } = await supabase.from("word-pairs").insert(newPair).select().single();

    if (error) {
      console.error("Error adding new pair:", error);
      setErrors({ new: { general: "Failed to add new pair. Please try again." } });
    } else if (data) {
      setPairs((prevPairs) => [data, ...prevPairs]);
      updateCategories([data, ...pairs]);
      clearAllErrors();
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCategoriesChange = (category: string) => {
    setEnabledCategories((prev) => {
      if (prev.includes(category)) {
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((c) => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

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

  const handleEditStart = (pair: Pair) => {
    setConfirmDelete("");
    clearAllErrors();
    if (editing !== pair.id) {
      setEditing(pair.id);
      setEditedPair({ ...pair });
    }
  };

  const handleEditConfirm = async () => {
    if (!user || !editedPair) return;

    const trimmedPair = {
      ...editedPair,
      word1: editedPair.word1.trim(),
      word2: editedPair.word2.trim(),
      category: editedPair.category ? editedPair.category.trim() : null,
    };

    const { error } = await supabase.from("word-pairs").update(trimmedPair).eq("id", trimmedPair.id);

    if (error) {
      console.error("Error updating pair:", error);
      setErrors({ [trimmedPair.id]: { general: "Failed to update pair. Please try again." } });
    } else {
      setPairs((prevPairs) => prevPairs.map((p) => (p.id === trimmedPair.id ? { ...p, ...trimmedPair } : p)));
      updateCategories(pairs.map((p) => (p.id === trimmedPair.id ? { ...p, ...trimmedPair } : p)));
      clearAllErrors();
    }

    setEditing("");
    setEditedPair(null);
  };

  const handleEditCancel = () => {
    setEditing("");
    setEditedPair(null);
  };

  const handlePairDelete = (pair: Pair) => {
    setEditing("");
    clearAllErrors();
    setConfirmDelete(pair.id);
  };

  const handleConfirmDelete = async (id: string) => {
    const { error } = await supabase.from("word-pairs").delete().eq("id", id);

    if (error) {
      console.error("Error deleting pair:", error);
      setErrors({ [id]: { general: "Failed to delete pair. Please try again." } });
    } else {
      const updatedPairs = pairs.filter((p) => p.id !== id);
      setPairs(updatedPairs);
      updateCategories(updatedPairs);
      setErrors({});
    }

    setConfirmDelete("");
  };

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

  const filteredPairs = pairs.filter((pair) => {
    const matchesSearch =
      pair.word1.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.word2.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      enabledCategories.length === 0 ||
      (pair.category && enabledCategories.includes(pair.category)) ||
      (!pair.category && enabledCategories.includes("None"));
    return matchesSearch && matchesCategory;
  });

  if (!user) {
    return <Spinner />;
  }

  return (
    <LazyMotion features={loadFeatures}>
      <section className={styles.wrapperMain}>
        <div className={styles.introWrapper}>
          <h3>Word Editor</h3>
          <p>Here you can add, edit and remove your word pairs.</p>
          <p>
            Each pair also has a <b>Category</b> field that can be used for all kinds of purposes.
          </p>
          <p>
            For example, you can create categories for different languages (English, German, Japanese), or sort the
            words by type (Family, Food, Animals) if you are only learning a single language.
          </p>
          <p>Experiment to find what works best for you!</p>
        </div>

        <m.div className={styles.mainControlsWrapper} variants={simpleVariants} initial='hidden' animate='show'>
          <div className={styles.searchWrapper}>
            <Search />
            <input
              className={styles.search}
              type='search'
              placeholder='Search by word'
              maxLength={25}
              onChange={handleSearch}
              disabled={!user || categoriesLoading}
            />
          </div>

          <div className={styles.categoriesWrapper}>
            <div className={styles.categoriesLabelWrapper}>
              <p>Filter by category</p>
            </div>
            {categoriesLoading ? (
              <Spinner marginTop='3vh' />
            ) : (
              <AnimateChangeInHeight className={styles.categoriesInnerHeightWrapper}>
                <m.ul>
                  <AnimatePresence>
                    {[...userCategories.map((uc) => uc.category), "None"].map((c) => (
                      <m.li key={c} value={c} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <m.div className={styles.checkWrapperOuter}>
                          <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: enabledCategories.includes(c) ? 1 : 0 }}
                            onClick={() => user && handleCategoriesChange(c)}
                          >
                            <Check />
                          </m.div>
                        </m.div>
                        <p>{c}</p>
                      </m.li>
                    ))}
                  </AnimatePresence>
                </m.ul>
              </AnimateChangeInHeight>
            )}
          </div>

          <m.button
            className={styles.addButton}
            initial={{ backgroundColor: "var(--color-background)" }}
            whileTap={user ? { backgroundColor: "var(--color-background-highlight)" } : {}}
            onClick={handleAdd}
            disabled={!user || categoriesLoading}
          >
            <Plus size={30} />
          </m.button>
        </m.div>

        {errors.new?.general && <p className={styles.errorMessage}>{errors.new.general}</p>}

        {user ? (
          <m.ul className={styles.list} layout>
            <AnimatePresence>
              {filteredPairs.map((p, index) => (
                <m.li
                  layout
                  key={p.id}
                  initial={{ opacity: 0, margin: "1rem 0 0 0" }}
                  animate={{ opacity: 1, margin: "1rem 0 0 0" }}
                  exit={{ opacity: 0, height: 0, margin: "1rem 0 0 0" }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <m.div
                    className={styles.wordDetailsWrapper}
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: editing === p.id ? 1 : 0.7 }}
                    onClick={(e) => editing !== p.id && handleDisabledInputClick(e, p.id)}
                  >
                    <div className={styles.wordWrapperOuter}>
                      <p className={styles.wordAttribute}>Word 1: </p>
                      <div className={styles.wordWrapper1}>
                        <input
                          required
                          maxLength={35}
                          disabled={editing !== p.id}
                          value={editing === p.id ? editedPair?.word1 : p.word1}
                          onChange={(e) => handleInputChange("word1", e.target.value)}
                          style={{ pointerEvents: editing !== p.id ? "none" : "auto" }}
                        />
                      </div>
                      {errors[p.id]?.word1 && <p className={styles.errorMessage}>{errors[p.id].word1}</p>}
                    </div>

                    <div className={styles.wordWrapperOuter}>
                      <p className={styles.wordAttribute}>Word 2: </p>
                      <div className={styles.wordWrapper2}>
                        <input
                          required
                          maxLength={35}
                          disabled={editing !== p.id}
                          value={editing === p.id ? editedPair?.word2 : p.word2}
                          onChange={(e) => handleInputChange("word2", e.target.value)}
                          style={{ pointerEvents: editing !== p.id ? "none" : "auto" }}
                        />
                      </div>
                      {errors[p.id]?.word2 && <p className={styles.errorMessage}>{errors[p.id].word2}</p>}
                    </div>
                    <div className={styles.categoryWrapperOuter}>
                      <p className={styles.wordAttribute}>Category: </p>
                      <div className={styles.categoryWrapper}>
                        <input
                          disabled={editing !== p.id}
                          value={editing === p.id ? editedPair?.category || "" : p.category || ""}
                          onChange={(e) => handleInputChange("category", e.target.value)}
                          style={{ pointerEvents: editing !== p.id ? "none" : "auto" }}
                        />
                      </div>
                    </div>
                  </m.div>

                  {errors[p.id]?.general && <p className={styles.errorMessage}>{errors[p.id].general}</p>}

                  <div className={styles.controlsWrapper}>
                    <m.div
                      className={styles.pairControlButton}
                      onClick={() => handleEditStart(p)}
                      initial={{ width: "4rem" }}
                      animate={{
                        width: editing === p.id ? "8rem" : "4rem",
                        x: shakeEditButton === p.id ? [0, -5, 5, -5, 5, 0] : 0,
                      }}
                      transition={{
                        width: { duration: 0.3 },
                        x: { duration: 0.4, ease: "easeInOut" },
                      }}
                    >
                      <AnimatePresence mode='wait'>
                        {editing === p.id ? (
                          <m.div
                            key={"confirmEdit"}
                            className={styles.pairControlButtonWrapper}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <m.button
                              initial={{ backgroundColor: "var(--color-background)" }}
                              whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                              onClick={handleEditConfirm}
                            >
                              <Check />
                            </m.button>
                            <span />
                            <m.button
                              initial={{ backgroundColor: "var(--color-background)" }}
                              whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                              onClick={handleEditCancel}
                            >
                              <X />
                            </m.button>
                          </m.div>
                        ) : (
                          <m.div
                            key={"editIcon"}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <Edit />
                          </m.div>
                        )}
                      </AnimatePresence>
                    </m.div>

                    <m.div
                      className={styles.pairControlButton}
                      initial={{ width: "4rem" }}
                      animate={{ width: confirmDelete === p.id ? "10rem" : "4rem" }}
                      onClick={() => confirmDelete !== p.id && handlePairDelete(p)}
                    >
                      <AnimatePresence mode='wait'>
                        {confirmDelete === p.id ? (
                          <m.div
                            key={"confirmDelete"}
                            className={styles.pairControlButtonWrapper}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <m.button
                              initial={{ backgroundColor: "var(--color-background)" }}
                              whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmDelete(p.id);
                              }}
                            >
                              <Check />
                            </m.button>
                            <span />
                            <m.button
                              initial={{ backgroundColor: "var(--color-background)" }}
                              whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelDelete();
                              }}
                            >
                              <X />
                            </m.button>
                          </m.div>
                        ) : (
                          <m.button
                            key={"deleteIcon"}
                            initial={{ opacity: 0, backgroundColor: "var(--color-background)" }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                          >
                            <Trash2 />
                          </m.button>
                        )}
                      </AnimatePresence>
                    </m.div>

                    <p className={styles.pairCount}>{filteredPairs.length - index}</p>
                  </div>
                </m.li>
              ))}
            </AnimatePresence>
          </m.ul>
        ) : (
          <Spinner />
        )}
      </section>
    </LazyMotion>
  );
}

export default EditWords;
