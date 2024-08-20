"usec lient";
import { FormEvent, useId, useState } from "react";
import { AnimatePresence, LazyMotion, m } from "framer-motion";
import { supabase } from "@/lib/supabase";

import styles from "./Auth.module.css";

import { Eye, EyeOff } from "react-feather";

const loadFeatures = () => import("../../featuresMax").then((res) => res.default);

const authOptions = ["Login", "Register"];

function Auth() {
  const [isOpen, setIsOpen] = useState(false);
  const [authOption, setAuthOption] = useState("Login");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const id = useId();

  const handleOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleAuthOptionChange = (option: string) => {
    setAuthOption(option);
    setError(null);
  };

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (error) throw error;

      console.log("User logged in:", data);
      // Handle successful login (e.g., redirect to dashboard)
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const handleRegister = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: username,
        password: password,
      });

      if (error) throw error;

      console.log("User registered:", data);
      // Handle successful registration (e.g., show verification message)
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (authOption === "Login") {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  return (
    <LazyMotion features={loadFeatures}>
      <div className={styles.mainWrapper}>
        <m.button
          className={styles.openButton}
          initial={{ backgroundColor: "var(--color-background)" }}
          whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
          onClick={handleOpen}
        >
          Get Started
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
                      className={styles.usernameInput}
                      type='email'
                      placeholder={authOption === "Login" ? "Login with your email" : "Sign up with your email"}
                      maxLength={30}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />

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
                  </div>

                  <div className={styles.errorWrapper}>
                    <p>{error}</p>
                  </div>

                  <m.button
                    type='submit'
                    className={styles.authButton}
                    initial={{ backgroundColor: "var(--color-background)" }}
                    whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                  >
                    {authOption}
                  </m.button>
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
