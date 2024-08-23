"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LazyMotion, m, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import styles from "./EditWords.module.css";

import { Check, ChevronDown, Plus, Search } from "react-feather";
import EditDeleteControls from "../EditDeleteControls";
import Spinner from "../Spinner";

import { useUserContext } from "@/contexts/UserContext";
import { Pair, Tag, UserCategory } from "@/constants";
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

  // State variables
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [newTag, setNewTag] = useState<Tag | null>(null);
  const [tags, setTags] = useState<(Tag & { tempId?: string })[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [enabledTags, setEnabledTags] = useState<string[]>([]);
  const [shakeEditButton, setShakeEditButton] = useState<string | null>(null);
  const [shakeEditButtonTag, setShakeEditButtonTag] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editing, setEditing] = useState("");
  const [pairTagsOpened, setPairTagsOpened] = useState("");
  const [confirmDeleteTag, setConfirmDeleteTag] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editedTag, setEditedTag] = useState<Tag | null>(null);
  const [editedPair, setEditedPair] = useState<Pair | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: { word1?: string; word2?: string; general?: string } }>({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const newTagInputRef = useRef<HTMLInputElement>(null);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const fetchAndUpdateData = useCallback(async () => {
    if (!user) return;

    try {
      const { data: pairsData, error: pairsError } = await supabase
        .from("word-pairs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (pairsError) {
        console.error("Error fetching word pairs:", pairsError);
        return;
      }

      setPairs(pairsData as Pair[]);

      const { data: tagsData, error: tagsError } = await supabase.from("tags").select("*").eq("user_id", user.id);

      if (tagsError) {
        console.error("Error fetching user tags:", tagsError);
        return;
      }

      setTags((prevTags) => {
        return tagsData.map((newTag) => {
          const existingTag = prevTags.find((t) => t.tempId === newTag.id);
          if (existingTag) {
            return { ...newTag, id: existingTag.id, tempId: newTag.id };
          }
          return newTag;
        });
      });
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

  ///////////////////////////////////////
  // Tag handlers

  const handleAddTag = () => {
    if (!user || newTag) return;

    const tempTag: Tag = {
      id: "temp-" + Date.now(),
      name: "",
      user_id: user.id,
      tempId: "temp-" + Date.now(),
    };

    setTags((prevTags) => [tempTag, ...prevTags]);
    setNewTag(tempTag);
    setEditingTag(tempTag.id);
    setEditedTag(tempTag);

    // setTimeout(() => {
    //   if (newTagInputRef.current) {
    //     newTagInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    //     newTagInputRef.current.focus();
    //   }
    // }, 100);
  };

  const handleEditTagStart = (tag: Tag) => {
    if (newTag && tag.id !== newTag.id) {
      handleEditTagCancel();
    }
    setConfirmDeleteTag("");
    clearAllErrors();
    if (editingTag !== tag.id) {
      setEditingTag(tag.id);
      setEditedTag({ ...tag });
    }
  };

  const handleEditTagConfirm = async () => {
    if (!user || !editedTag) return;

    if (editedTag.name.trim() === "") {
      setErrors({ [editedTag.id]: { general: "Tag name cannot be empty." } });
      return;
    }

    const existingTag = tags.find(
      (tag) => tag.name.toLowerCase() === editedTag.name.toLowerCase() && tag.id !== editedTag.id
    );
    if (existingTag) {
      setErrors({ [editedTag.id]: { general: "A tag with this name already exists." } });
      return;
    }

    if (editedTag.id.startsWith("temp-")) {
      const { data, error } = await supabase
        .from("tags")
        .insert({
          name: editedTag.name,
          user_id: user.id,
        })
        .select();

      if (error) {
        console.error("Error adding new tag:", error);
        setErrors({ [editedTag.id]: { general: "Failed to add new tag. Please try again." } });
      } else if (data) {
        setTags((prevTags) =>
          prevTags.map((tag) => (tag.id === editedTag.id ? { ...data[0], id: editedTag.id, tempId: data[0].id } : tag))
        );
        clearAllErrors();
      }
    } else {
      const { error } = await supabase.from("tags").update({ name: editedTag.name }).eq("id", editedTag.id);

      if (error) {
        console.error("Error updating tag:", error);
        setErrors({ [editedTag.id]: { general: "Failed to update tag. Please try again." } });
      } else {
        setTags((prevTags) => prevTags.map((tag) => (tag.id === editedTag.id ? editedTag : tag)));
        clearAllErrors();
      }
    }

    setEditingTag(null);
    setEditedTag(null);
    setNewTag(null);
  };

  const handleEditTagCancel = () => {
    if (newTag) {
      setTags((prevTags) => prevTags.filter((tag) => tag.id !== newTag.id));
    }
    setEditingTag(null);
    setEditedTag(null);
    setNewTag(null);
  };

  const handleTagDelete = (tag: Tag) => {
    setEditingTag(null);
    clearAllErrors();
    setConfirmDeleteTag(tag.id);
  };

  const handleConfirmDeleteTag = async (id: string) => {
    const tagToDelete = tags.find((tag) => tag.id === id);

    if (!tagToDelete) {
      console.error("Tag not found for deletion");
      return;
    }

    setTags((prevTags) => prevTags.filter((tag) => tag.id !== id));
    setNewTag(null);

    setTimeout(async () => {
      const realId = tagToDelete.tempId || tagToDelete.id;

      const { error } = await supabase.from("tags").delete().eq("id", realId);

      if (error) {
        console.error("Error deleting tag:", error);
        setErrors({ [id]: { general: "Failed to delete tag. Please try again." } });
        setTags((prevTags) => [...prevTags, tagToDelete]);
      } else {
        setEnabledTags((prevEnabled) => prevEnabled.filter((tagId) => tagId !== realId));

        const updatedPairs = pairs.map((pair) => ({
          ...pair,
          tag_ids: Array.isArray(pair.tag_ids) ? pair.tag_ids.filter((tagId) => tagId !== realId) : [],
        }));
        setPairs(updatedPairs);

        supabase
          .from("word-pairs")
          .upsert(updatedPairs)
          .then(({ error: updateError }) => {
            if (updateError) {
              console.error("Error updating pairs after tag deletion:", updateError);
            }
          });

        setErrors({});
      }
    }, 300);
  };

  const handleCancelDeleteTag = () => {
    setConfirmDeleteTag("");
  };

  const handleInputChangeTag = (field: keyof Tag, value: string) => {
    if (editedTag) {
      setEditedTag({ ...editedTag, [field]: value });
      setErrors((prev) => ({
        ...prev,
        [editedTag.id]: { ...prev[editedTag.id], [field]: undefined },
      }));
    }
  };

  const handleTagsChange = (tagId: string) => {
    setEnabledTags((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  };

  const handleDisabledTagInputClick = useCallback(
    (e: React.MouseEvent, tagId: string) => {
      e.stopPropagation();
      if (editingTag !== tagId) {
        setShakeEditButtonTag(tagId);
        setTimeout(() => setShakeEditButtonTag(null), 500);
      }
    },
    [editingTag]
  );

  ///////////////////////////////////////
  // Pair handlers

  const handleAdd = async () => {
    if (!user) return;

    const newPair: Omit<Pair, "id" | "created_at"> = {
      word1: "Word 1",
      word2: "Word 2",
      tag_ids: [],
      user_id: user.id,
    };

    const { error } = await supabase.from("word-pairs").insert(newPair);

    if (error) {
      console.error("Error adding new pair:", error);
      setErrors({ new: { general: "Failed to add new pair. Please try again." } });
    } else {
      await fetchAndUpdateData();
      clearAllErrors();
    }
  };

  const handleEditStart = (pair: Pair) => {
    if (newTag) {
      handleEditTagCancel();
    }
    setConfirmDelete("");
    clearAllErrors();
    if (editing !== pair.id) {
      setEditing(pair.id);
      setEditedPair({ ...pair, tag_ids: [...pair.tag_ids] });
    }
  };

  const handleEditConfirm = async () => {
    if (!user || !editedPair) return;

    const updatedPair = {
      ...editedPair,
      word1: editedPair.word1.trim(),
      word2: editedPair.word2.trim(),
      tag_ids: editedPair.tag_ids.map((id) => {
        const tag = tags.find((t) => t.id === id || t.tempId === id);
        return tag ? tag.tempId || tag.id : id;
      }),
    };

    const { error } = await supabase.from("word-pairs").update(updatedPair).eq("id", updatedPair.id);

    if (error) {
      console.error("Error updating pair:", error);
      setErrors({ [updatedPair.id]: { general: "Failed to update pair. Please try again." } });
    } else {
      setPairs((prevPairs) => prevPairs.map((pair) => (pair.id === updatedPair.id ? updatedPair : pair)));
      clearAllErrors();
    }
    setPairTagsOpened("");
    setEditing("");
    setEditedPair(null);
  };

  const handleEditCancel = () => {
    setEditing("");
    setEditedPair(null);
    setPairTagsOpened("");
  };

  const handlePairDelete = (pair: Pair) => {
    setEditing("");
    clearAllErrors();
    setPairTagsOpened("");
    setConfirmDelete(pair.id);
  };

  const handleConfirmDelete = async (id: string) => {
    const { error } = await supabase.from("word-pairs").delete().eq("id", id);

    if (error) {
      console.error("Error deleting pair:", error);
      setErrors({ [id]: { general: "Failed to delete pair. Please try again." } });
    } else {
      await fetchAndUpdateData();
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

  ///////////////////////////////////////
  // Tag-Pair interaction handlers

  const handlePairTagsOpen = (pairId: string) => {
    if (pairTagsOpened !== pairId) {
      setPairTagsOpened(pairId);
    } else {
      setPairTagsOpened("");
    }
  };

  const handleTagToggle = (pairId: string, tagId: string) => {
    const tag = tags.find((t) => t.id === tagId || t.tempId === tagId);
    if (!tag) return;

    const realTagId = tag.tempId || tag.id;

    if (editing === pairId && editedPair) {
      const updatedTagIds = editedPair.tag_ids.includes(tagId)
        ? editedPair.tag_ids.filter((id) => id !== tagId)
        : [...editedPair.tag_ids, tagId];

      setEditedPair({ ...editedPair, tag_ids: updatedTagIds });
    } else {
      const pair = pairs.find((p) => p.id === pairId);
      if (pair) {
        const updatedTagIds = pair.tag_ids.includes(realTagId)
          ? pair.tag_ids.filter((id) => id !== realTagId)
          : [...pair.tag_ids, realTagId];

        setPairs((prevPairs) => prevPairs.map((p) => (p.id === pairId ? { ...p, tag_ids: updatedTagIds } : p)));

        supabase
          .from("word-pairs")
          .update({ tag_ids: updatedTagIds })
          .eq("id", pairId)
          .then(({ error }) => {
            if (error) {
              console.error("Error updating pair tags:", error);
            }
          });
      }
    }
  };

  ///////////////////////////////////////
  // Search and filter

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredPairs = pairs.filter((pair) => {
    const matchesSearch =
      pair.word1.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.word2.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags =
      enabledTags.length === 0 || (pair.tag_ids && pair.tag_ids.some((tagId) => enabledTags.includes(tagId)));
    return matchesSearch && matchesTags;
  });

  ///////////////////////////////////////
  // Render

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
            Each pair also has <b>Tags</b> that can be used for all kinds of purposes.
          </p>
          <p>
            For example, you can create tags for different languages (English, German, Japanese), or sort the words by
            type (Family, Food, Animals) if you are only learning a single language.
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
              disabled={!user || tagsLoading}
            />
          </div>

          <AnimateChangeInHeight className={styles.tagsWrapper}>
            <div className={styles.tagsLabelWrapper}>
              <p>Filter by tags</p>
            </div>
            <div className={styles.tagAddWrapper}>
              <m.button
                className={styles.addTagButton}
                initial={{ backgroundColor: "var(--color-background)", opacity: 1 }}
                animate={{ opacity: !!newTag ? 0.3 : 1 }}
                whileTap={user && !newTag ? { backgroundColor: "var(--color-background-highlight)" } : {}}
                onClick={handleAddTag}
                disabled={!user || tagsLoading || !!newTag}
              >
                <p>Add tag</p>
                <Plus size={25} />
              </m.button>
            </div>
            {tagsLoading ? (
              <Spinner margin='4rem calc(50% - 2rem)' />
            ) : (
              <AnimatePresence mode='wait'>
                {tags.length === 0 ? (
                  <m.div
                    key={"notagsyet"}
                    className={styles.noTagsWrapper}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p>No tags yet.</p>
                  </m.div>
                ) : (
                  <m.ul
                    layout
                    key={"tagsulkey"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <AnimatePresence>
                      {tags.map((t) => (
                        <m.li
                          layout
                          key={t.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <div className={styles.tagLeftWrapper}>
                            <m.div className={styles.checkWrapperOuter}>
                              <m.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: enabledTags.includes(t.id) ? 1 : 0 }}
                                onClick={() => user && handleTagsChange(t.id)}
                              >
                                <Check />
                              </m.div>
                            </m.div>
                          </div>
                          <div className={styles.tagRightWrapper}>
                            <m.div
                              initial={{ opacity: 0.5 }}
                              animate={{ opacity: editingTag === t.id ? 1 : 0.5 }}
                              onClick={(e) => editingTag !== t.id && handleDisabledTagInputClick(e, t.id)}
                            >
                              <input
                                ref={t.id === newTag?.id ? newTagInputRef : null}
                                required
                                maxLength={15}
                                disabled={editingTag !== t.id}
                                value={editingTag === t.id ? editedTag?.name : t.name}
                                onChange={(e) => handleInputChangeTag("name", e.target.value)}
                                style={{ pointerEvents: editingTag !== t.id ? "none" : "auto" }}
                                autoFocus={t.id === newTag?.id}
                                placeholder='Tag names must be unique'
                              />
                              {errors[t.id]?.general && <p className={styles.errorMessage}>{errors[t.id].general}</p>}
                            </m.div>
                            <div className={styles.tagControlsWrapper}>
                              <EditDeleteControls
                                isEditing={editingTag === t.id}
                                confirmDelete={confirmDeleteTag === t.id}
                                onEditStart={() => handleEditTagStart(t)}
                                onEditConfirm={handleEditTagConfirm}
                                onEditCancel={handleEditTagCancel}
                                onDeleteStart={() => handleTagDelete(t)}
                                onDeleteConfirm={() => handleConfirmDeleteTag(t.id)}
                                onDeleteCancel={handleCancelDeleteTag}
                                shakeEditButton={shakeEditButtonTag === t.id}
                                centerIcons={false}
                              />
                            </div>
                          </div>
                        </m.li>
                      ))}
                    </AnimatePresence>
                  </m.ul>
                )}
              </AnimatePresence>
            )}
          </AnimateChangeInHeight>

          <m.button
            className={styles.addButton}
            initial={{ backgroundColor: "var(--color-background)" }}
            whileTap={user ? { backgroundColor: "var(--color-background-highlight)" } : {}}
            onClick={handleAdd}
            disabled={!user || tagsLoading}
          >
            <p>Add word pair</p>
            <Plus size={25} />
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
                  className={styles.wordPairListItem}
                  initial={{ opacity: 0, margin: "1rem 0 0 0" }}
                  animate={{ opacity: 1, margin: "1rem 0 0 0" }}
                  exit={{ opacity: 0, height: 0, margin: "1rem 0 0 0" }}
                  transition={{ duration: 0.3, delay: 0 }}
                >
                  <m.div
                    className={styles.wordDetailsWrapper}
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: editing === p.id ? 1 : 0.7 }}
                  >
                    <div className={styles.wordWrapperOuter}>
                      <p className={styles.wordAttribute}>Word 1: </p>
                      <div
                        className={styles.wordWrapper1}
                        onClick={(e) => editing !== p.id && handleDisabledInputClick(e, p.id)}
                      >
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
                      <div
                        className={styles.wordWrapper2}
                        onClick={(e) => editing !== p.id && handleDisabledInputClick(e, p.id)}
                      >
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

                    <m.div className={styles.pairTagsWrapper} variants={controlsVariants}>
                      <div
                        className={styles.pairTagsLabelWrapper}
                        onClick={(e) =>
                          editing === p.id ? handlePairTagsOpen(p.id) : handleDisabledInputClick(e, p.id)
                        }
                      >
                        <p>Tags:</p>
                        <m.div initial={{ rotate: 0 }} animate={{ rotate: pairTagsOpened === p.id ? 180 : 0 }}>
                          <ChevronDown />
                        </m.div>
                      </div>

                      <AnimatePresence>
                        {pairTagsOpened === p.id && (
                          <m.ul initial='hidden' animate='show' exit='hidden' variants={tagsUlVariants}>
                            {tags.map((t) => (
                              <li key={t.id}>
                                <m.div className={styles.checkWrapperOuter}>
                                  <m.div
                                    initial={{ opacity: 0 }}
                                    animate={{
                                      opacity: (
                                        (editing === p.id && editedPair ? editedPair.tag_ids : p.tag_ids) || []
                                      ).includes(t.id)
                                        ? 1
                                        : 0,
                                    }}
                                    onClick={() => handleTagToggle(p.id, t.id)}
                                  >
                                    <Check />
                                  </m.div>
                                </m.div>
                                <p>{t.name}</p>
                              </li>
                            ))}
                          </m.ul>
                        )}
                      </AnimatePresence>
                    </m.div>
                  </m.div>

                  {errors[p.id]?.general && <p className={styles.errorMessage}>{errors[p.id].general}</p>}

                  <div className={styles.controlsWrapper}>
                    <EditDeleteControls
                      isEditing={editing === p.id}
                      confirmDelete={confirmDelete === p.id}
                      onEditStart={() => handleEditStart(p)}
                      onEditConfirm={handleEditConfirm}
                      onEditCancel={handleEditCancel}
                      onDeleteStart={() => handlePairDelete(p)}
                      onDeleteConfirm={() => handleConfirmDelete(p.id)}
                      onDeleteCancel={handleCancelDelete}
                      shakeEditButton={shakeEditButton === p.id}
                      centerIcons={true}
                    />
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
