import { FormEvent, useId, useState } from "react";
import { AnimatePresence, LazyMotion, m } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

import styles from "./Auth.module.css";

import { Eye, EyeOff } from "react-feather";
import { login, register, resetPassword, sendMagicLink } from "@/app/actions/auth";
import { useUserContext } from "@/contexts/UserContext";
import Spinner from "../Spinner";

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
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [hideForgot, setHideForgot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const { setUser } = useUserContext();
  const id = useId();

  const handleOpen = () => setIsOpen(!isOpen);

  const handleAuthOptionChange = (option: string) => {
    setAuthOption(option);
    setError(null);
    setSuccessMessage(null);
    setIsButtonDisabled(false);
  };

  const handleShowPassword = () => setShowPassword(!showPassword);

  const handleModalClick = (e: React.MouseEvent) => e.stopPropagation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    try {
      let result;

      switch (authOption) {
        case "Login":
          result = await login(trimmedEmail, trimmedPassword);
          break;
        case "Register":
          result = await register(trimmedEmail, trimmedPassword);
          break;
        case "Magic Link":
          result = await sendMagicLink(trimmedEmail);
          break;
        default:
          throw new Error("Invalid auth option");
      }

      if (result.error) {
        throw new Error(result.error);
      }

      if (authOption === "Register") {
        setSuccessMessage("Registration successful!\nPlease check your email to confirm your account.");
        setIsButtonDisabled(true);
      } else if (authOption === "Magic Link") {
        setSuccessMessage("Magic link sent!\nPlease check your email to sign in.");
        setIsButtonDisabled(true);
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
        setIsOpen(false);
        router.push("/learn");
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email address first.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await resetPassword(trimmedEmail);

      if (result.error) {
        throw new Error(result.error);
      }

      setSuccessMessage("Password reset email sent!\nPlease check your email to reset your password.");
      setIsButtonDisabled(true);
      setHideForgot(true);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
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
          whileHover={{ backgroundColor: "var(--color-background-highlight)" }}
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
                      minLength={5}
                      maxLength={35}
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
                          maxLength={65}
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
                    animate={{ opacity: isLoading || isButtonDisabled ? 0.5 : 1 }}
                    whileTap={
                      isLoading || isButtonDisabled
                        ? { backgroundColor: "var(--color-background)" }
                        : { backgroundColor: "var(--color-background-highlight)" }
                    }
                    whileHover={
                      isLoading || isButtonDisabled
                        ? { backgroundColor: "var(--color-background)" }
                        : { backgroundColor: "var(--color-background-highlight)" }
                    }
                    disabled={isLoading || isButtonDisabled}
                    style={{ cursor: isLoading || isButtonDisabled ? "default" : "pointer" }}
                  >
                    {isLoading ? (
                      <Spinner margin='0' height='30px' width='30px' borderWidth='3px' />
                    ) : authOption === "Magic Link" ? (
                      "Send Magic Link"
                    ) : (
                      authOption
                    )}
                  </m.button>

                  {authOption === "Login" && (
                    <div className={styles.forgotWrapper}>
                      <m.button
                        type='button'
                        className={styles.forgotButton}
                        onClick={handleForgotPassword}
                        disabled={isLoading || isButtonDisabled}
                        style={{
                          cursor: isLoading || isButtonDisabled ? "default" : "pointer",
                        }}
                        initial={{ opacity: 1 }}
                        animate={{ opacity: hideForgot ? 0 : 1 }}
                      >
                        Forgot password?
                      </m.button>
                    </div>
                  )}

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
