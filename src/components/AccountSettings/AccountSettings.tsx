"use client";
import { useState, FormEvent, useEffect, useRef } from "react";
import { AnimatePresence, LazyMotion, m } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

import styles from "./AccountSettings.module.css";

import { Check, Edit, X, Eye, EyeOff, Trash2, AlertTriangle } from "react-feather";
import Spinner from "../Spinner";

import { useUserContext } from "@/contexts/UserContext";

const loadFeatures = () => import("../../features").then((res) => res.default);

function AccountSettings() {
  const { user, loading, setUser } = useUserContext();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [shakeEditButton, setShakeEditButton] = useState(false);
  const router = useRouter();

  // Delete all data state
  const [showDeleteAllModal, setShowDeleteAllModal] = useState<"pairs" | "categories" | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);
  const [deleteAllSuccess, setDeleteAllSuccess] = useState<string | null>(null);
  const deleteAllSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deleteAllSuccessTimerRef.current) {
        clearTimeout(deleteAllSuccessTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
    if (user) {
      setEmail(user.email || "");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "true") {
      setEditing(true);

      setSuccessMessage("Please set your new password");
    }
  }, []);

  const handleDisabledInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShakeEditButton(true);
    setTimeout(() => setShakeEditButton(false), 500);
  };

  const handleEditing = () => {
    setEditing(!editing);
    if (!editing) {
      setEmail(user?.email || "");
      setPassword("");
    }
    setError(null);
    setSuccessMessage(null);
  };

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleEditConfirm = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      const updates: { email?: string; password?: string } = {};
      if (trimmedEmail !== user?.email) updates.email = trimmedEmail;
      if (trimmedPassword) updates.password = trimmedPassword;

      if (Object.keys(updates).length === 0) {
        setSuccessMessage("No changes made.");
        setEditing(false);
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase.auth.updateUser(updates);

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        setSuccessMessage(
          "Account settings updated successfully! If you updated the email, please check the new address for confirmation link."
        );
      }

      setEditing(false);
      setPassword("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCancel = () => {
    setEditing(false);
    setEmail(user?.email || "");
    setPassword("");
    setError(null);
    setSuccessMessage(null);
  };

  const handleDeleteAllClick = (type: "pairs" | "categories") => {
    setDeleteAllError(null);
    setDeleteAllSuccess(null);
    setShowDeleteAllModal(type);
  };

  const handleCancelDeleteAll = () => {
    setShowDeleteAllModal(null);
  };

  const handleConfirmDeleteAll = async () => {
    if (!user || !showDeleteAllModal) return;

    setIsDeletingAll(true);
    setDeleteAllError(null);
    setDeleteAllSuccess(null);

    const label = showDeleteAllModal === "pairs" ? "word pairs" : "tags";

    try {
      if (showDeleteAllModal === "pairs") {
        const { error } = await supabase
          .from("word-pairs")
          .delete()
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        // Delete from both tables to clean up legacy data
        const [tagsResult, categoriesResult] = await Promise.all([
          supabase.from("tags").delete().eq("user_id", user.id),
          supabase.from("pair-categories").delete().eq("user_id", user.id),
        ]);
        if (tagsResult.error) throw tagsResult.error;
        if (categoriesResult.error) throw categoriesResult.error;
      }

      setDeleteAllSuccess(`All ${label} have been deleted.`);
      deleteAllSuccessTimerRef.current = setTimeout(() => setDeleteAllSuccess(null), 10000);
      setShowDeleteAllModal(null);
    } catch (error) {
      setDeleteAllError((error as Error).message);
      setShowDeleteAllModal(null);
    } finally {
      setIsDeletingAll(false);
    }
  };

  if (loading || !user) {
    return <Spinner />;
  }

  return (
    <LazyMotion features={loadFeatures}>
      <section className={styles.mainWrapper}>
        <h1>Update account information</h1>
        <p>
          Here you can change your email address and password. If you are using Magic Link or Google to login, you can
          also add a password to enable email/password login.
        </p>

        <m.form key={"authDataForm"} onSubmit={handleEditConfirm} className={styles.form}>
          <m.div
            className={styles.inputsWrapper}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={(e) => !editing && handleDisabledInputClick(e)}
            style={{ pointerEvents: editing ? "none" : "auto" }}
          >
            <div className={styles.emailInputWrapper}>
              <label>
                Email:
                <m.input
                  className={styles.emailInput}
                  type='email'
                  animate={{ opacity: editing ? 1 : 0.5 }}
                  placeholder='Your email'
                  maxLength={30}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!editing}
                  style={{ pointerEvents: editing ? "auto" : "none" }}
                />
              </label>
            </div>

            <div className={styles.passwordInputWrapper}>
              <label>
                Password:
                <m.input
                  className={styles.passwordInput}
                  type={showPassword ? "text" : "password"}
                  animate={{ opacity: editing ? 1 : 0.5 }}
                  placeholder='New password (leave blank to keep current)'
                  minLength={6}
                  maxLength={45}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!editing}
                  style={{ pointerEvents: editing ? "auto" : "none" }}
                />
              </label>
              <m.button
                className={styles.passwordVisibilityWrapper}
                type='button'
                animate={{ opacity: editing ? 1 : 0.5 }}
                onClick={handleShowPassword}
                disabled={!editing}
                style={{ pointerEvents: editing ? "auto" : "none" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <Eye size={20} color='var(--color-background-secondary)' />
                ) : (
                  <EyeOff size={20} color='var(--color-background-secondary)' />
                )}
              </m.button>
            </div>
          </m.div>

          <m.div
            className={styles.buttonsWrapper}
            initial={{ width: "4rem", opacity: 0 }}
            animate={{ width: editing ? "8rem" : "4rem", opacity: 1 }}
          >
            <AnimatePresence mode='wait'>
              {editing ? (
                isSubmitting ? (
                  <m.div
                    key={"spinnerWrapper"}
                    className={styles.spinnerWrapper}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Spinner height='25px' width='25px' borderWidth='2px' aria-label='Submitting changes' />
                  </m.div>
                ) : (
                  <m.div
                    key={"confirmEdit"}
                    className={styles.submitButtonWrapper}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <m.button
                      type='submit'
                      initial={{ backgroundColor: "var(--color-background)" }}
                      whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                      disabled={isSubmitting}
                      aria-label='Confirm changes'
                    >
                      <Check />
                    </m.button>
                    <span />
                    <m.button
                      type='button'
                      initial={{ backgroundColor: "var(--color-background)" }}
                      whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                      onClick={handleEditCancel}
                      disabled={isSubmitting}
                      aria-label='Cancel changes'
                    >
                      <X />
                    </m.button>
                  </m.div>
                )
              ) : (
                <m.button
                  type='button'
                  key={"editIcon"}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    x: shakeEditButton ? [0, -5, 5, -5, 5, 0] : 0,
                  }}
                  transition={{
                    x: { duration: 0.4, ease: "easeInOut" },
                  }}
                  exit={{ opacity: 0 }}
                  onClick={!editing ? handleEditing : undefined}
                  aria-label='Edit account information'
                >
                  <Edit />
                </m.button>
              )}
            </AnimatePresence>
          </m.div>

          <div className={styles.messageWrapper} aria-live='polite' aria-atomic='true'>
            <p>{error && error}</p>
            <p>{successMessage && successMessage}</p>
          </div>
        </m.form>

        {/* Delete All Data Section */}
        <section className={styles.deleteAllSection}>
          <h2>Delete all data</h2>
          <p>
            Permanently delete all word pairs or tags associated with your account. These actions cannot be undone.
          </p>

          <div className={styles.deleteAllButtonsWrapper}>
            <m.button
              className={styles.deleteAllButton}
              initial={{ backgroundColor: "var(--color-background)" }}
              whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
              onClick={() => handleDeleteAllClick("pairs")}
              disabled={isDeletingAll}
            >
              <Trash2 size={20} />
              Delete all word pairs
            </m.button>

            <m.button
              className={styles.deleteAllButton}
              initial={{ backgroundColor: "var(--color-background)" }}
              whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
              onClick={() => handleDeleteAllClick("categories")}
              disabled={isDeletingAll}
            >
              <Trash2 size={20} />
              Delete all tags
            </m.button>
          </div>

          <div className={styles.deleteAllMessageWrapper} aria-live='polite' aria-atomic='true'>
            {deleteAllError && <p className={styles.deleteAllError}>{deleteAllError}</p>}
            {deleteAllSuccess && <p className={styles.deleteAllSuccess}>{deleteAllSuccess}</p>}
          </div>
        </section>
      </section>

      {/* Delete All Confirmation Modal */}
      <AnimatePresence>
        {showDeleteAllModal && (
          <>
            <m.div
              className={styles.modalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelDeleteAll}
            />
            <m.div
              className={styles.modal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.modalContent}>
                <AlertTriangle size={48} />
                <h3>
                  Delete all {showDeleteAllModal === "pairs" ? "word pairs" : "tags"}?
                </h3>
                <p>
                  This action cannot be undone. All {showDeleteAllModal === "pairs" ? "word pairs" : "tags"}{" "}
                  associated with your account will be permanently deleted.
                </p>
                <div className={styles.modalButtons}>
                  <m.button
                    className={styles.cancelButton}
                    initial={{ backgroundColor: "var(--color-background)" }}
                    whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                    onClick={handleCancelDeleteAll}
                  >
                    <X size={20} />
                    Cancel
                  </m.button>
                  <m.button
                    className={styles.deleteButton}
                    initial={{ backgroundColor: "var(--color-text-danger)" }}
                    whileTap={{ backgroundColor: "#b91c1c" }}
                    onClick={handleConfirmDeleteAll}
                  >
                    <Trash2 size={20} />
                    Delete all
                  </m.button>
                </div>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}

export default AccountSettings;