"use client";
import { useState, FormEvent, useEffect, useCallback } from "react";
import { AnimatePresence, LazyMotion, m } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

import styles from "./AccountSettings.module.css";

import { Check, Edit, X, Eye, EyeOff } from "react-feather";
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
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
    if (user) {
      setEmail(user.email || "");
    }
  }, [user, loading, router]);

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
        setSuccessMessage("No changes to update.");
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

  if (loading || !user) {
    return <Spinner />;
  }

  return (
    <LazyMotion features={loadFeatures}>
      <section className={styles.mainWrapper}>
        <h2>Update account information</h2>
        <p>
          You can update your email address and password here. If you&apos;re using Magic Link authentication, you can
          add or update a password to enable email/password login as well.
        </p>

        <m.form key={"authDataForm"} onSubmit={handleEditConfirm} className={styles.form}>
          <m.div className={styles.inputsWrapper} initial={{ opacity: 0 }} animate={{ opacity: editing ? 1 : 0.5 }}>
            <input
              className={styles.emailInput}
              type='email'
              placeholder='Your email'
              maxLength={30}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!editing}
            />

            <div className={styles.passwordInputWrapper}>
              <input
                className={styles.passwordInput}
                type={showPassword ? "text" : "password"}
                placeholder='New password (leave blank to keep current)'
                minLength={6}
                maxLength={45}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!editing}
              />
              <button type='button' className={styles.passwordVisibilityWrapper} onClick={handleShowPassword}>
                {showPassword ? (
                  <Eye size={20} color='var(--color-background-secondary)' />
                ) : (
                  <EyeOff size={20} color='var(--color-background-secondary)' />
                )}
              </button>
            </div>
          </m.div>

          <m.div
            className={styles.submitButton}
            onClick={!editing ? handleEditing : undefined}
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
                    <Spinner height='25px' width='25px' borderWidth='2px' />
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
                    >
                      <X />
                    </m.button>
                  </m.div>
                )
              ) : (
                <m.div key={"editIcon"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Edit />
                </m.div>
              )}
            </AnimatePresence>
          </m.div>

          <div className={styles.messageWrapper}>
            <p>{error && error}</p>
            <p>{successMessage && successMessage}</p>
          </div>
        </m.form>
      </section>
    </LazyMotion>
  );
}

export default AccountSettings;
