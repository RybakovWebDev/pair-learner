"use client";
import { AnimatePresence, m } from "framer-motion";

import styles from "./EditDeleteControls.module.css";

import { Check, Edit, Trash2, X } from "react-feather";

interface EditDeleteControlsProps {
  wrapperMargins?: string;
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
  wrapperMargins = "1rem 0 1rem 0",
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
    <div
      className={styles.controlsWrapper}
      style={{ margin: wrapperMargins, justifyContent: centerIcons ? "center" : "flex-start" }}
    >
      <m.div
        className={styles.controlButton}
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
                aria-label='Confirm edit'
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
                aria-label='Cancel edit'
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
            <m.button
              key={"editIcon"}
              aria-label='Edit'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleEditClick}
            >
              <Edit />
            </m.button>
          )}
        </AnimatePresence>
      </m.div>

      <m.div
        className={styles.controlButton}
        onClick={handleDeleteClick}
        initial={{ width: "4rem" }}
        animate={{ width: confirmDelete ? "8rem" : "4rem" }}
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
                aria-label='Confirm delete'
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
                aria-label='Cancel delete'
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
              aria-label='Delete'
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
