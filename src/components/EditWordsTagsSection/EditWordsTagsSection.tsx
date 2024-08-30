"use client";
import React, { useState, useCallback } from "react";
import { AnimatePresence, m } from "framer-motion";
import { supabase } from "@/lib/supabase";

import styles from "./EditWordsTagsSection.module.css";

import { Plus } from "react-feather";
import EditDeleteControls from "../EditDeleteControls";
import Spinner from "../Spinner";

import { Tag, Pair } from "@/constants";
import { AnimateChangeInHeight } from "@/helpers";

interface EditWordsTagsSectionProps {
  user: any;
  tags: (Tag & { tempId?: string })[];
  setTags: React.Dispatch<React.SetStateAction<(Tag & { tempId?: string })[]>>;
  pairs: Pair[];
  setPairs: React.Dispatch<React.SetStateAction<Pair[]>>;
  tagsLoading: boolean;
}

const EditWordsTagsSection: React.FC<EditWordsTagsSectionProps> = ({
  user,
  tags,
  setTags,
  pairs,
  setPairs,
  tagsLoading,
}) => {
  const [newTag, setNewTag] = useState<Tag | null>(null);
  const [shakeEditButtonTag, setShakeEditButtonTag] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [confirmDeleteTag, setConfirmDeleteTag] = useState("");
  const [editedTag, setEditedTag] = useState<Tag | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: { general?: string } }>({});

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const handleAddTag = useCallback(() => {
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
  }, [user, newTag, setTags]);

  const handleEditTagCancel = useCallback(() => {
    if (newTag) {
      setTags((prevTags) => prevTags.filter((tag) => tag.id !== newTag.id));
    }
    setEditingTag(null);
    setEditedTag(null);
    setNewTag(null);
  }, [newTag, setTags]);

  const handleEditTagStart = useCallback(
    (tag: Tag) => {
      if (newTag && tag.id !== newTag.id) {
        handleEditTagCancel();
      }
      setConfirmDeleteTag("");
      clearAllErrors();
      if (editingTag !== tag.id) {
        setEditingTag(tag.id);
        setEditedTag({ ...tag });
      }
    },
    [newTag, editingTag, clearAllErrors, handleEditTagCancel]
  );

  const handleEditTagConfirm = useCallback(async () => {
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

    if (editedTag.id.startsWith("temp-") && editedTag.tempId?.startsWith("temp-")) {
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
      const { error } = await supabase.from("tags").update({ name: editedTag.name }).eq("id", editedTag.tempId);

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
  }, [user, editedTag, tags, clearAllErrors, setTags]);

  const handleTagDelete = useCallback(
    (tag: Tag) => {
      if (newTag) {
        handleEditTagCancel();
      }
      setEditingTag(null);
      clearAllErrors();
      setConfirmDeleteTag(tag.id);
    },
    [newTag, handleEditTagCancel, clearAllErrors]
  );

  const handleConfirmDeleteTag = useCallback(
    async (id: string) => {
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
    },
    [tags, setTags, pairs, setPairs]
  );

  const handleCancelDeleteTag = useCallback(() => {
    setConfirmDeleteTag("");
  }, []);

  const handleInputChangeTag = useCallback(
    (field: keyof Tag, value: string) => {
      if (editedTag) {
        setEditedTag({ ...editedTag, [field]: value });
        setErrors((prev) => ({
          ...prev,
          [editedTag.id]: { ...prev[editedTag.id], [field]: undefined },
        }));
      }
    },
    [editedTag]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && editingTag && editedTag) {
        e.preventDefault();
        handleEditTagConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleEditTagCancel();
      }
    },
    [editingTag, editedTag, handleEditTagConfirm, handleEditTagCancel]
  );

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

  return (
    <AnimateChangeInHeight className={styles.tagsWrapper}>
      <div className={styles.tagsLabelWrapper}>
        <p>Edit tags</p>
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
              <p>No tags added yet.</p>
            </m.div>
          ) : (
            <m.ul layout key={"tagsulkey"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AnimatePresence>
                {tags.map((t) => (
                  <m.li
                    layout
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className={styles.tagItemInnerWrapper}>
                      <m.div
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: editingTag === t.id ? 1 : 0.5 }}
                        onClick={(e) => editingTag !== t.id && handleDisabledTagInputClick(e, t.id)}
                      >
                        <input
                          required
                          maxLength={15}
                          disabled={editingTag !== t.id}
                          value={editingTag === t.id ? editedTag?.name : t.name}
                          onChange={(e) => handleInputChangeTag("name", e.target.value)}
                          onKeyDown={handleKeyDown}
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
  );
};

export default EditWordsTagsSection;
