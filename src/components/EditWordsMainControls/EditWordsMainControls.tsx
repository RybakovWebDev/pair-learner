"use client";
import { useState } from "react";
import { AnimatePresence, LayoutGroup, m } from "framer-motion";

import styles from "./EditWordsMainControls.module.css";

import { Plus, Trash2, X, AlertTriangle, CheckSquare } from "react-feather";
import { User } from "@supabase/supabase-js";

import useViewportSize from "@/hooks/useViewportSize";

interface EditWordsMainControlsProps {
  isAddingNewPair: boolean;
  tagsLoading: boolean;
  isImporting: boolean;
  searchQuery: string;
  user: User;
  multipleSelection: boolean;
  selectedPairs: string[];
  handleMultipleSelection: () => void;
  handleAdd: () => void;
  handleMultipleDelete: () => void;
}

const EditWordsMainControls = ({
  isAddingNewPair,
  tagsLoading,
  isImporting,
  searchQuery,
  user,
  multipleSelection,
  selectedPairs,
  handleMultipleSelection,
  handleAdd,
  handleMultipleDelete,
}: EditWordsMainControlsProps) => {
  const viewPortSize = useViewportSize();
  const isMobile = viewPortSize.width && viewPortSize.width < 650;
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteClick = () => {
    if (selectedPairs.length > 0) {
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = () => {
    handleMultipleDelete();
    setShowDeleteModal(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  return (
    <>
      <div className={styles.controlButtonsWrapper}>
        <LayoutGroup>
          <AnimatePresence>
            {multipleSelection && (
              <m.button
                layoutId={"multiple-delete"}
                className={styles.button}
                initial={{ backgroundColor: "var(--color-background)", opacity: 0 }}
                animate={{
                  opacity: isAddingNewPair || Boolean(searchQuery) || selectedPairs.length === 0 ? 0.5 : 1,
                }}
                exit={{ opacity: 0 }}
                style={{
                  pointerEvents:
                    isAddingNewPair || Boolean(searchQuery) || selectedPairs.length === 0 ? "none" : "auto",
                }}
                whileTap={
                  user && !isAddingNewPair && selectedPairs.length > 0
                    ? { backgroundColor: "var(--color-background-highlight)" }
                    : {}
                }
                onClick={handleDeleteClick}
                disabled={
                  !user ||
                  tagsLoading ||
                  isAddingNewPair ||
                  Boolean(searchQuery) ||
                  isImporting ||
                  selectedPairs.length === 0
                }
              >
                {!isMobile && <p>Delete ({selectedPairs.length})</p>}
                {isMobile && <p>{selectedPairs.length}</p>}
                <Trash2 size={25} />
              </m.button>
            )}
          </AnimatePresence>

          <m.button
            layoutId={"multiple-select"}
            className={styles.button}
            initial={{ backgroundColor: "var(--color-background)" }}
            animate={{ opacity: isAddingNewPair || Boolean(searchQuery) ? 0.5 : 1 }}
            style={{ pointerEvents: isAddingNewPair || Boolean(searchQuery) ? "none" : "auto" }}
            whileTap={user && !isAddingNewPair ? { backgroundColor: "var(--color-background-highlight)" } : {}}
            onClick={handleMultipleSelection}
            disabled={!user || tagsLoading || isAddingNewPair || Boolean(searchQuery) || isImporting}
          >
            {!isMobile && <p>{multipleSelection ? "Cancel selection" : "Select multiple"}</p>}
            {multipleSelection ? <X size={25} /> : <CheckSquare size={25} />}
          </m.button>
          <m.button
            layoutId={"add-pair"}
            className={styles.button}
            initial={{ backgroundColor: "var(--color-background)" }}
            animate={{ opacity: isAddingNewPair || Boolean(searchQuery) ? 0.5 : 1 }}
            style={{ pointerEvents: isAddingNewPair || Boolean(searchQuery) ? "none" : "auto" }}
            whileTap={user && !isAddingNewPair ? { backgroundColor: "var(--color-background-highlight)" } : {}}
            onClick={handleAdd}
            disabled={!user || tagsLoading || isAddingNewPair || Boolean(searchQuery) || isImporting}
          >
            {!isMobile && <p>Add word pair</p>}
            <Plus size={25} />
          </m.button>
        </LayoutGroup>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <>
            <m.div
              className={styles.modalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelDelete}
            />
            <m.div className={styles.modal} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className={styles.modalContent}>
                <AlertTriangle size={48} className={styles.warningIcon} />
                <h3>
                  Delete {selectedPairs.length} word {selectedPairs.length === 1 ? "pair" : "pairs"}?
                </h3>
                <p>This action cannot be undone. The selected word pairs will be permanently deleted.</p>
                <div className={styles.modalButtons}>
                  <m.button
                    className={styles.cancelButton}
                    initial={{ backgroundColor: "var(--color-background)" }}
                    whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                    onClick={handleCancelDelete}
                  >
                    <X size={20} />
                    Cancel
                  </m.button>
                  <m.button
                    className={styles.deleteButton}
                    initial={{ backgroundColor: "var(--color-text-danger)" }}
                    whileTap={{ backgroundColor: "#b91c1c" }}
                    onClick={handleConfirmDelete}
                  >
                    <Trash2 size={20} />
                    Delete
                  </m.button>
                </div>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default EditWordsMainControls;
