"use client";
import { AnimatePresence, m } from "framer-motion";

import styles from "./EditDeleteControls.module.css";

import { Check, Edit, Trash2, X } from "react-feather";

interface EditDeleteControlsProps {
  isEditing: boolean;
  confirmDelete: boolean;
  onEditStart: () => void;
  onEditConfirm: () => void;
  onEditCancel: () => void;
  onDeleteStart: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  shakeEditButton: boolean;
  centerIcons?: boolean;
}

const EditDeleteControls = ({
  isEditing,
  confirmDelete,
  onEditStart,
  onEditConfirm,
  onEditCancel,
  onDeleteStart,
  onDeleteConfirm,
  onDeleteCancel,
  shakeEditButton,
  centerIcons = true,
}: EditDeleteControlsProps) => {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDeleteCancel();
    }
    if (isEditing) {
      onEditCancel();
    } else {
      onEditStart();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) {
      onEditCancel();
    }
    if (confirmDelete) {
      onDeleteCancel();
    } else {
      onDeleteStart();
    }
  };

  return (
    <div className={styles.controlsWrapper} style={{ justifyContent: centerIcons ? "center" : "flex-start" }}>
      <m.div
        className={styles.controlButton}
        onClick={handleEditClick}
        initial={{ width: "4rem" }}
        animate={{
          width: isEditing ? "8rem" : "4rem",
          x: shakeEditButton ? [0, -5, 5, -5, 5, 0] : 0,
        }}
        transition={{
          width: { duration: 0.3 },
          x: { duration: 0.4, ease: "easeInOut" },
        }}
      >
        <AnimatePresence mode='wait'>
          {isEditing ? (
            <m.div
              key={"confirmEdit"}
              className={styles.controlButtonWrapper}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <m.button
                initial={{ backgroundColor: "var(--color-background)" }}
                whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditConfirm();
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
                  onEditCancel();
                }}
              >
                <X />
              </m.button>
            </m.div>
          ) : (
            <m.div key={"editIcon"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Edit />
            </m.div>
          )}
        </AnimatePresence>
      </m.div>

      <m.div
        className={styles.controlButton}
        onClick={handleDeleteClick}
        initial={{ width: "4rem" }}
        animate={{ width: confirmDelete ? "10rem" : "4rem" }}
      >
        <AnimatePresence mode='wait'>
          {confirmDelete ? (
            <m.div
              key={"confirmDelete"}
              className={styles.controlButtonWrapper}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <m.button
                initial={{ backgroundColor: "var(--color-background)" }}
                whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConfirm();
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
                  onDeleteCancel();
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
    </div>
  );
};

export default EditDeleteControls;
