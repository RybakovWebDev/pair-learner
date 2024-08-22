import { FormEvent, useId, useState } from "react";
import { AnimatePresence, LazyMotion, m } from "framer-motion";
import { supabase } from "@/lib/supabase";

import styles from "./Auth.module.css";

import { Eye, EyeOff } from "react-feather";

const loadFeatures = () => import("../../featuresMax").then((res) => res.default);

const authOptions = ["Login", "Register", "Magic Link"];

interface AuthProps {
  margin?: string;
  openButtonFontSize?: string;
  openButtonPadding?: string;
  openButtonText: string;
}

function Auth({
  margin = "0",
  openButtonFontSize = "16px",
  openButtonPadding = "0.5rem 1rem",
  openButtonText,
}: AuthProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [authOption, setAuthOption] = useState("Login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const id = useId();

  const handleOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleAuthOptionChange = (option: string) => {
    setAuthOption(option);
    setError(null);
    setSuccessMessage(null);
  };

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleLogin = async () => {
    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      if (error) throw error;
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const handleRegister = async () => {
    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      if (error) throw error;
      setSuccessMessage("Registration successful!\nPlease check your email to confirm your account.");
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const handleMagicLink = async () => {
    try {
      const trimmedEmail = email.trim();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
      });
      if (error) throw error;
      setSuccessMessage("Magic link sent!\nPlease check your email to sign in.");
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    switch (authOption) {
      case "Login":
        handleLogin();
        break;
      case "Register":
        handleRegister();
        break;
      case "Magic Link":
        handleMagicLink();
        break;
    }
  };

  return (
    <LazyMotion features={loadFeatures}>
      <div className={styles.mainWrapper} style={{ margin: margin }}>
        <m.button
          style={{ fontSize: openButtonFontSize, padding: openButtonPadding }}
          className={styles.openButton}
          initial={{ backgroundColor: "var(--color-background)" }}
          whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
          onClick={handleOpen}
        >
          {openButtonText}
        </m.button>
        <AnimatePresence>
          {isOpen && (
            <m.div
              className={styles.backdrop}
              onClick={handleOpen}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <m.div
                key={"authModal"}
                className={styles.modalWrapper}
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ duration: 0.3 }}
                onClick={handleModalClick}
              >
                <div className={styles.authOptionSelector}>
                  {authOptions.map((a) => (
                    <button key={a} onClick={() => handleAuthOptionChange(a)}>
                      <h3>{a}</h3>
                      <AnimatePresence>
                        {authOption === a && (
                          <m.div
                            className={styles.hovered}
                            layoutId={id}
                            initial={{ opacity: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
                            animate={{
                              opacity: 1,
                            }}
                            exit={{ opacity: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
                            transition={{ type: "spring", damping: 70, stiffness: 1000 }}
                          />
                        )}
                      </AnimatePresence>
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSubmit} className={styles.bottomWrapper}>
                  <div className={styles.inputsWrapper}>
                    <input
                      className={styles.emailInput}
                      type='email'
                      placeholder={
                        authOption === "Login"
                          ? "Login with your email"
                          : authOption === "Register"
                          ? "Sign up with your email"
                          : "Enter your email for passwordless login"
                      }
                      maxLength={30}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />

                    {authOption !== "Magic Link" && (
                      <div className={styles.passwordInputWrapper}>
                        <input
                          className={styles.passwordInput}
                          type={showPassword ? "text" : "password"}
                          placeholder={authOption === "Login" ? "Your password" : "Create a password"}
                          minLength={6}
                          maxLength={45}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button type='button' className={styles.passwordVisibilityWrapper} onClick={handleShowPassword}>
                          {showPassword ? (
                            <Eye size={20} color='var(--color-background-secondary)' />
                          ) : (
                            <EyeOff size={20} color='var(--color-background-secondary)' />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <m.button
                    type='submit'
                    className={styles.authButton}
                    initial={{ backgroundColor: "var(--color-background)" }}
                    whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                  >
                    {authOption === "Magic Link" ? "Send Magic Link" : authOption}
                  </m.button>
                  <div className={styles.messageWrapper}>
                    {error && (
                      <m.p
                        key={"errormsg"}
                        className={styles.errorMessage}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {error}
                      </m.p>
                    )}
                    {successMessage && (
                      <m.div
                        key={"successmsg"}
                        className={styles.successMessage}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {successMessage.split("\n").map((line, index) => (
                          <p key={index}>{line}</p>
                        ))}
                      </m.div>
                    )}
                  </div>
                </form>
              </m.div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}

export default Auth;
