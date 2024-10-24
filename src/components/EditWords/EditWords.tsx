"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LazyMotion, m, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

import styles from "./EditWords.module.css";

import { Check, ChevronDown, HelpCircle, Plus, Search } from "react-feather";
import EditWordsTagsSection from "../EditWordsTagsSection";
import EditDeleteControls from "../EditDeleteControls";
import Spinner from "../Spinner";

import { useUserContext } from "@/contexts/UserContext";
import { Pair, simpleFadeVariants, Tag } from "@/constants";
import { AnimateChangeInHeight } from "@/helpers";

const loadFeatures = () => import("../../featuresMax").then((res) => res.default);

type ImportedPair = {
  word1: string;
  word2: string;
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

  const [pairs, setPairs] = useState<(Pair & { tempId?: string })[]>([]);
  const [tags, setTags] = useState<(Tag & { tempId?: string })[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [shakeEditButton, setShakeEditButton] = useState<string | null>(null);
  const [isAddingNewPair, setIsAddingNewPair] = useState(false);
  const [editing, setEditing] = useState("");
  const [pairTagsOpened, setPairTagsOpened] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editedPair, setEditedPair] = useState<(Pair & { tempId?: string }) | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: { word1?: string; word2?: string; general?: string } }>({});
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLDivElement>(null);

  const MAX_FILE_SIZE = 1024 * 1024; // 1MB
  const MAX_PAIRS = 300;

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
      const { data: pairsData, error: pairsError } = await supabase
        .from("word-pairs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (pairsError) {
        console.error("Error fetching word pairs:", pairsError);
        return;
      }

      const updatedPairsData = pairsData.map((pair: Pair) => ({
        ...pair,
        tempId: pair.id,
      }));

      setPairs(updatedPairsData as (Pair & { tempId?: string })[]);

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
        handleEditSave(editedPair).then(() => {
          setEditing(pair.id);
          setEditedPair({ ...pair, tag_ids: [...pair.tag_ids] });
          setPairTagsOpened((prev) => (prev !== pair.id ? pair.id : prev));
          setConfirmDelete("");
          clearAllErrors();
        });
      } else {
        setEditing(pair.id);
        setEditedPair({ ...pair, tag_ids: [...pair.tag_ids] });
        setPairTagsOpened((prev) => (prev !== pair.id ? pair.id : prev));
        setConfirmDelete("");
        clearAllErrors();
      }
    },
    [editing, editedPair, handleEditSave, clearAllErrors]
  );

  const handleEditCancel = useCallback(() => {
    if (editedPair) {
      if (editedPair.id.startsWith("temp-") && editedPair.tempId?.startsWith("temp-")) {
        setPairs((prevPairs) => prevPairs.filter((pair) => pair.id !== editedPair.id));
      }
    }
    setEditing("");
    setEditedPair(null);
    setIsAddingNewPair(false);
  }, [editedPair]);

  const handlePairDelete = useCallback(
    (pair: Pair & { tempId?: string }) => {
      if (editing && editedPair) {
        if (editedPair.id.startsWith("temp-") && editedPair.tempId?.startsWith("temp-")) {
          setPairs((prevPairs) => prevPairs.filter((p) => p.id !== editedPair.id));
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
    [editing, editedPair, handleEditSave, clearAllErrors]
  );

  const handleConfirmDelete = useCallback(
    async (id: string) => {
      const pairToDelete = pairs.find((pair) => pair.id === id);

      if (!pairToDelete) {
        console.error("Pair not found for deletion");
        return;
      }

      setPairs((prevPairs) => prevPairs.filter((pair) => pair.id !== id));

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

      setConfirmDelete("");
    },
    [pairs]
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
      console.log(value);
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

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleImport = () => {
    setImportSuccess("");
    setImportError("");
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      return;
    }
    setImportSuccess("");
    setImportError("");
    setIsImporting(true);
    const file = event.target.files?.[0];
    if (!file) {
      setIsImporting(false);
      return;
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (!fileExtension || !["csv", "xlsx", "xls"].includes(fileExtension)) {
      setImportError("Please select a CSV or Excel file");
      setIsImporting(false);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setImportError("File is too large. Maximum size is 1MB.");
      setIsImporting(false);
      return;
    }

    try {
      const XLSX = await import("xlsx");

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        defval: "",
      }) as unknown[][];

      const hasExtraColumns = rows.some(
        (row) => row.filter((cell) => cell !== "" && cell !== null && cell !== undefined).length > 2
      );

      if (hasExtraColumns) {
        setImportError(
          "File contains more than 2 columns. Please ensure your file has exactly two columns for word pairs."
        );
        return;
      }

      const validPairs: ImportedPair[] = rows
        .filter(
          (row: unknown[]): row is [string, string, ...unknown[]] =>
            Array.isArray(row) &&
            row.length >= 2 &&
            typeof row[0] === "string" &&
            typeof row[1] === "string" &&
            Boolean(row[0].trim()) &&
            Boolean(row[1].trim())
        )
        .map((row) => {
          const word1 = row[0].trim().split(",")[0].trim().slice(0, 35);
          const processedWord1 = word1.charAt(0).toUpperCase() + word1.slice(1);

          const word2 = row[1].trim().split(",")[0].trim().slice(0, 35);
          const processedWord2 = word2.charAt(0).toUpperCase() + word2.slice(1);

          return {
            word1: processedWord1,
            word2: processedWord2,
          };
        })
        .slice(0, MAX_PAIRS);

      if (validPairs.length === 0) {
        setImportError("No valid word pairs found in file. Make sure each row has exactly two words.");
        setIsImporting(false);
        return;
      }

      if (rows.length > MAX_PAIRS) {
        setImportError(`File contains too many rows. Only the first ${MAX_PAIRS} valid pairs will be imported.`);
      }

      const pairsToInsert = validPairs.map((pair) => ({
        ...pair,
        user_id: user.id,
        tag_ids: [],
      }));

      const { data: insertedPairs, error: insertError } = await supabase
        .from("word-pairs")
        .insert(pairsToInsert)
        .select();

      if (insertError) {
        console.error("Error inserting pairs:", insertError);
        setImportError("Failed to import pairs. Please try again.");
        setIsImporting(false);
        return;
      }

      if (insertedPairs) {
        setPairs((prevPairs) => [
          ...insertedPairs.map((pair) => ({
            ...pair,
            tempId: pair.id,
          })),
          ...prevPairs,
        ]);
        setImportSuccess(`Success! Imported ${validPairs.length} pairs.`);
        setTimeout(() => {
          scrollToSearch();
        }, 100);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      setImportError("Error reading file. Please make sure it's a valid file format.");
      setImportSuccess("");
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const filteredPairs = pairs.filter((pair) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesWord =
      pair.word1.toLowerCase().includes(searchLower) || pair.word2.toLowerCase().includes(searchLower);

    const matchesTags = pair.tag_ids.some((tagId) => {
      const tag = tags.find((t) => t.id === tagId);
      return tag && tag.name.toLowerCase().includes(searchLower);
    });

    return matchesWord || matchesTags;
  });

  if (!user) {
    return <Spinner />;
  }

  return (
    <LazyMotion features={loadFeatures}>
      <section className={styles.wrapperMain}>
        <div className={styles.introWrapper}>
          <h3>Word Editor</h3>

          <m.div
            className={styles.helpOuterWrapper}
            onClick={() => setHelpOpen(!helpOpen)}
            whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
          >
            <p>View Help</p>
            <HelpCircle />

            <AnimateChangeInHeight>
              <AnimatePresence>
                {helpOpen && (
                  <m.div
                    key={"help"}
                    className={styles.helpInnerWrapper}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p>Here you can add, edit and remove your word pairs.</p>
                    <p>
                      Each pair also has <b>Tags</b> that can be used for all kinds of purposes.
                    </p>
                    <p>
                      For example, you can create tags for different languages (English, German, Japanese etc.), or sort
                      the words by type (Family, Food, Animals and so on) if you are only learning a single language.
                    </p>
                    <p>Experiment to find what works best for you!</p>
                    <span>Hints:</span>
                    <ul>
                      <li>You can press &quot;Enter&quot; to confirm changes to a word pair</li>
                      <li>
                        You can use browser extensions like Duolingo Ninja to download all of your known Duolingo words
                        into a table and import them here
                      </li>
                    </ul>
                  </m.div>
                )}
              </AnimatePresence>
            </AnimateChangeInHeight>
          </m.div>

          <div className={styles.importWrapper}>
            <p>
              You can also import a list of word pairs from a file. It has to be an Excel or CSV table formatted with
              two columns, where each row is a pair of words.
            </p>

            <input
              ref={fileInputRef}
              type='file'
              accept='.csv,.xlsx,.xls'
              onChange={handleFileSelect}
              style={{ display: "none" }}
              aria-label='Import word pairs from CSV or Excel file'
            />

            <m.button
              className={styles.importButton}
              initial={{ backgroundColor: "var(--color-background)" }}
              animate={{
                opacity: isAddingNewPair || Boolean(searchQuery) || isImporting ? 0.5 : 1,
              }}
              style={{
                pointerEvents: isAddingNewPair || Boolean(searchQuery) || isImporting ? "none" : "auto",
              }}
              whileTap={
                user && !isAddingNewPair && !isImporting ? { backgroundColor: "var(--color-background-highlight)" } : {}
              }
              onClick={handleImport}
              disabled={!user || tagsLoading || isAddingNewPair || Boolean(searchQuery) || isImporting}
            >
              <p>{isImporting ? "Importing..." : "Import word pairs"}</p>
              {isImporting ? <Spinner height='20px' width='20px' borderWidth='2px' /> : <Plus size={25} />}
            </m.button>

            <AnimateChangeInHeight className={styles.importMessageWrapper}>
              <AnimatePresence>
                {importError && (
                  <m.p
                    className={styles.errorMessage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {importError}
                  </m.p>
                )}
                {importSuccess && (
                  <m.p
                    className={styles.successMessage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {importSuccess}
                  </m.p>
                )}
              </AnimatePresence>
            </AnimateChangeInHeight>
          </div>
        </div>

        <m.div className={styles.mainControlsWrapper} variants={simpleFadeVariants} initial='hidden' animate='show'>
          <EditWordsTagsSection
            user={user}
            tags={tags}
            setTags={setTags}
            pairs={pairs}
            setPairs={setPairs}
            tagsLoading={tagsLoading}
          />

          <div className={styles.searchWrapper} ref={searchInputRef}>
            <label htmlFor='search-input' className={styles.visuallyHidden}>
              Search by word or tag
            </label>
            <Search />
            <input
              id='search-input'
              className={styles.search}
              type='search'
              placeholder='Search pairs by word or tag'
              maxLength={25}
              onChange={handleSearch}
              disabled={!user || tagsLoading || isImporting}
            />
          </div>

          <m.button
            className={styles.addButton}
            initial={{ backgroundColor: "var(--color-background)" }}
            animate={{ opacity: isAddingNewPair || Boolean(searchQuery) ? 0.5 : 1 }}
            style={{ pointerEvents: isAddingNewPair || Boolean(searchQuery) ? "none" : "auto" }}
            whileTap={user && !isAddingNewPair ? { backgroundColor: "var(--color-background-highlight)" } : {}}
            onClick={handleAdd}
            disabled={!user || tagsLoading || isAddingNewPair || Boolean(searchQuery) || isImporting}
          >
            <p>Add word pair</p>
            <Plus size={25} />
          </m.button>
        </m.div>

        {errors.new?.general && <p className={styles.errorMessage}>{errors.new.general}</p>}

        {user ? (
          <>
            {filteredPairs.length > 0 ? (
              <m.ul className={styles.list} layout>
                <AnimatePresence>
                  {filteredPairs.map((p, index) => (
                    <m.li
                      layout
                      key={p.id}
                      className={styles.wordPairListItem}
                      initial={{ opacity: 0, margin: "1rem 0 0 0" }}
                      animate={{ opacity: 1, margin: "1rem 0 0 0" }}
                      exit={{ opacity: 0, margin: "1rem 0 0 0" }}
                      transition={{ duration: 0.3, delay: 0 }}
                    >
                      <m.div
                        className={styles.wordDetailsWrapper}
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: editing === p.id ? 1 : 0.7 }}
                      >
                        <div className={styles.wordWrapperOuter}>
                          <label htmlFor={`word1-${p.id}`} className={styles.wordAttribute}>
                            Word 1:
                          </label>
                          <div
                            className={styles.wordWrapper1}
                            onClick={(e) => editing !== p.id && handleDisabledInputClick(e, p.id)}
                          >
                            <input
                              id={`word1-${p.id}`}
                              required
                              maxLength={35}
                              disabled={editing !== p.id}
                              value={editing === p.id ? editedPair?.word1 : p.word1}
                              onChange={(e) => handleInputChange("word1", e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, "word1")}
                              style={{ pointerEvents: editing !== p.id ? "none" : "auto" }}
                            />
                          </div>
                        </div>

                        <div className={styles.wordWrapperOuter}>
                          <label htmlFor={`word2-${p.id}`} className={styles.wordAttribute}>
                            Word 2:
                          </label>
                          <div
                            className={styles.wordWrapper2}
                            onClick={(e) => editing !== p.id && handleDisabledInputClick(e, p.id)}
                          >
                            <input
                              id={`word2-${p.id}`}
                              required
                              maxLength={35}
                              disabled={editing !== p.id}
                              value={editing === p.id ? editedPair?.word2 : p.word2}
                              onChange={(e) => handleInputChange("word2", e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, "word2")}
                              style={{ pointerEvents: editing !== p.id ? "none" : "auto" }}
                            />
                          </div>
                        </div>

                        <AnimateChangeInHeight>
                          {(errors[p.id]?.word1 || errors[p.id]?.word2 || errors[p.id]?.general) && (
                            <div className={styles.errorWrapper}>
                              {errors[p.id]?.word1 && <p className={styles.errorMessage}>{errors[p.id].word1}</p>}
                              {errors[p.id]?.word2 && <p className={styles.errorMessage}>{errors[p.id].word2}</p>}
                              {errors[p.id]?.general && <p className={styles.errorMessage}>{errors[p.id].general}</p>}
                            </div>
                          )}
                        </AnimateChangeInHeight>

                        <m.div className={styles.pairTagsWrapper} variants={controlsVariants}>
                          <div className={styles.pairTagsLabelWrapper} onClick={() => handlePairTagsOpen(p.id)}>
                            <p>Tags:</p>
                            <m.div initial={{ rotate: 0 }} animate={{ rotate: pairTagsOpened === p.id ? 180 : 0 }}>
                              <ChevronDown />
                            </m.div>
                          </div>

                          <AnimatePresence>
                            {pairTagsOpened === p.id && (
                              <m.ul initial='hidden' animate='show' exit='hidden' variants={tagsUlVariants}>
                                {tags.map((t) => {
                                  const realTagId = t.tempId || t.id;
                                  return (
                                    <li
                                      key={realTagId}
                                      onClick={() => handleTagToggle(p.id, realTagId)}
                                      style={{ cursor: editing === p.id ? "pointer" : "default" }}
                                    >
                                      <m.div className={styles.checkWrapperOuter}>
                                        <m.div
                                          initial={{ opacity: 0 }}
                                          animate={{
                                            opacity:
                                              editing === p.id && editedPair
                                                ? editedPair.tag_ids.includes(realTagId)
                                                  ? 1
                                                  : 0
                                                : p.tag_ids.includes(realTagId)
                                                ? 1
                                                : 0,
                                          }}
                                        >
                                          <Check />
                                        </m.div>
                                      </m.div>
                                      <p>{t.name}</p>
                                    </li>
                                  );
                                })}
                              </m.ul>
                            )}
                          </AnimatePresence>
                        </m.div>
                      </m.div>

                      {errors[p.id]?.general && <p className={styles.errorMessage}>{errors[p.id].general}</p>}

                      <div className={styles.controlsWrapper}>
                        <EditDeleteControls
                          wrapperMargins='0'
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
            ) : tagsLoading ? (
              <Spinner />
            ) : (
              <m.p
                className={pairs.length !== 0 ? styles.noResultsMessage : styles.noPairsMessage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {pairs.length !== 0 ? "No word pairs match your search." : "No word pairs yet."}
              </m.p>
            )}
          </>
        ) : (
          <Spinner />
        )}
      </section>
    </LazyMotion>
  );
}

export default EditWords;
