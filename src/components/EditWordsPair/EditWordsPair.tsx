"use client";
import React, { useCallback } from "react";
import { AnimatePresence, m } from "framer-motion";

import styles from "./EditWordsPair.module.css";

import { ChevronDown } from "react-feather";
import EditWordsPairControls from "../EditWordsPairControls";

import { Pair, Tag } from "@/constants";

interface EditWordsPairProps {
  pair: Pair & { tempId?: string };
  index: number;
  totalCount: number;
  searchQuery: string;
  tags: (Tag & { tempId?: string })[];
  editing: string;
  editedPair: (Pair & { tempId?: string }) | null;
  shakeEditButton: string | null;
  pairTagsOpened: string;
  confirmDelete: string;
  errors: { [key: string]: { word1?: string; word2?: string; general?: string } };
  tagsUlVariants: any;
  controlsVariants: any;
  onEditStart: (pair: Pair & { tempId?: string }) => void;
  onEditConfirm: () => void;
  onEditCancel: () => void;
  onDeleteStart: (pair: Pair & { tempId?: string }) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
  onPairTagsOpen: (id: string) => void;
  onTagToggle: (pairId: string, tagId: string) => void;
  onInputChange: (field: keyof Pair, value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, field: "word1" | "word2") => void;
  onDisabledInputClick: (e: React.MouseEvent, pairId: string) => void;
  multipleSelection?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

const EditWordsPair: React.FC<EditWordsPairProps> = React.memo(
  ({
    pair: p,
    index,
    totalCount,
    searchQuery,
    tags,
    editing,
    editedPair,
    shakeEditButton,
    pairTagsOpened,
    confirmDelete,
    errors,
    tagsUlVariants,
    controlsVariants,
    onEditStart,
    onEditConfirm,
    onEditCancel,
    onDeleteStart,
    onDeleteConfirm,
    onDeleteCancel,
    onPairTagsOpen,
    onTagToggle,
    onInputChange,
    onKeyDown,
    onDisabledInputClick,
    multipleSelection,
    isSelected,
    onToggleSelection,
  }) => {
    const handleEditStart = useCallback(() => onEditStart(p), [onEditStart, p]);
    const handleDeleteStart = useCallback(() => onDeleteStart(p), [onDeleteStart, p]);
    const handleConfirmDelete = useCallback(() => onDeleteConfirm(p.id), [onDeleteConfirm, p.id]);
    const handlePairTagsOpen = useCallback(() => onPairTagsOpen(p.id), [onPairTagsOpen, p.id]);

    return (
      <m.li
        layout
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
            <div className={styles.wordWrapper1} onClick={(e) => editing !== p.id && onDisabledInputClick(e, p.id)}>
              <input
                id={`word1-${p.id}`}
                required
                maxLength={35}
                disabled={editing !== p.id}
                value={editing === p.id ? editedPair?.word1 : p.word1}
                onChange={(e) => onInputChange("word1", e.target.value)}
                onKeyDown={(e) => onKeyDown(e, "word1")}
                style={{ pointerEvents: editing !== p.id ? "none" : "auto" }}
              />
            </div>
          </div>

          <div className={styles.wordWrapperOuter}>
            <label htmlFor={`word2-${p.id}`} className={styles.wordAttribute}>
              Word 2:
            </label>
            <div className={styles.wordWrapper2} onClick={(e) => editing !== p.id && onDisabledInputClick(e, p.id)}>
              <input
                id={`word2-${p.id}`}
                required
                maxLength={35}
                disabled={editing !== p.id}
                value={editing === p.id ? editedPair?.word2 : p.word2}
                onChange={(e) => onInputChange("word2", e.target.value)}
                onKeyDown={(e) => onKeyDown(e, "word2")}
                style={{ pointerEvents: editing !== p.id ? "none" : "auto" }}
              />
            </div>
          </div>

          {(errors[p.id]?.word1 || errors[p.id]?.word2 || errors[p.id]?.general) && (
            <div className={styles.errorWrapper}>
              {errors[p.id]?.word1 && <p className={styles.errorMessage}>{errors[p.id].word1}</p>}
              {errors[p.id]?.word2 && <p className={styles.errorMessage}>{errors[p.id].word2}</p>}
              {errors[p.id]?.general && <p className={styles.errorMessage}>{errors[p.id].general}</p>}
            </div>
          )}

          <m.div className={styles.pairTagsWrapper} variants={controlsVariants}>
            <div className={styles.pairTagsLabelWrapper} onClick={handlePairTagsOpen}>
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
                    const isChecked =
                      editing === p.id && editedPair
                        ? editedPair.tag_ids.includes(realTagId)
                        : p.tag_ids.includes(realTagId);

                    return (
                      <li key={realTagId}>
                        <input
                          type='checkbox'
                          id={`tag-${p.id}-${realTagId}`}
                          className={styles.tagCheckbox}
                          checked={isChecked}
                          onChange={() => editing === p.id && onTagToggle(p.id, realTagId)}
                          disabled={editing !== p.id}
                        />
                        <label
                          htmlFor={`tag-${p.id}-${realTagId}`}
                          style={{ cursor: editing === p.id ? "pointer" : "default" }}
                        >
                          {t.name}
                        </label>
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
          <EditWordsPairControls
            wrapperMargins='0'
            isEditing={editing === p.id}
            confirmDelete={confirmDelete === p.id}
            onEditStart={handleEditStart}
            onEditConfirm={onEditConfirm}
            onEditCancel={onEditCancel}
            onDeleteStart={handleDeleteStart}
            onDeleteConfirm={handleConfirmDelete}
            onDeleteCancel={onDeleteCancel}
            shakeEditButton={shakeEditButton === p.id}
            centerIcons={true}
            multipleSelection={multipleSelection}
            isSelected={isSelected}
            onToggleSelection={onToggleSelection}
          />

          <p className={styles.pairCount}>{searchQuery ? index + 1 : totalCount - index}</p>
        </div>
      </m.li>
    );
  }
);

EditWordsPair.displayName = "EditWordsPair";

export default EditWordsPair;
