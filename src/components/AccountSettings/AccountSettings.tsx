"use client";
import { useState, FormEvent, useEffect } from "react";
import { AnimatePresence, LazyMotion, m } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import styles from "./AccountSettings.module.css";

import { Check, Edit, X, Eye, EyeOff } from "react-feather";

import { useUserContext } from "@/contexts/UserContext";
import Spinner from "../Spinner";

const loadFeatures = () => import("../../features").then((res) => res.default);

function AccountSettings() {
  const { user, loading, setUser } = useUserContext();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
    }
  }, [user]);

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

    try {
      const updates: { email?: string; password?: string } = {};
      if (email !== user?.email) updates.email = email;
      if (password) updates.password = password;

      if (Object.keys(updates).length === 0) {
        setSuccessMessage("No changes to update.");
        return;
      }

      const { data, error } = await supabase.auth.updateUser(updates);

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        setSuccessMessage("Account settings updated successfully!");
      }

      setEditing(false);
      setPassword("");
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const handleEditCancel = () => {
    setEditing(false);
    setEmail(user?.email || "");
    setPassword("");
    setError(null);
    setSuccessMessage(null);
  };

  if (!user) {
    return <Spinner />;
  }

  return (
    <LazyMotion features={loadFeatures}>
      <section className={styles.mainWrapper}>
        <h2>Update account information</h2>
        <p>
          Leave password empty if you don&apos;t <br /> want to change it.
        </p>

        <m.form key={"authDataForm"} onSubmit={handleEditConfirm} className={styles.form}>
          <div className={styles.inputsWrapper}>
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
          </div>

          <m.div
            className={styles.submitButton}
            onClick={!editing ? handleEditing : undefined}
            initial={{ width: "4rem" }}
            animate={{ width: editing ? "8rem" : "4rem" }}
          >
            <AnimatePresence mode='wait'>
              {editing ? (
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
                  >
                    <Check />
                  </m.button>
                  <span />
                  <m.button
                    type='button'
                    initial={{ backgroundColor: "var(--color-background)" }}
                    whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                    onClick={handleEditCancel}
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
