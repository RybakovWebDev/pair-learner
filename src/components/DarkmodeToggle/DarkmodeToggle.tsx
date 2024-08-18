import { useState } from "react";
import Cookies from "js-cookie";
import { AnimatePresence, LazyMotion, m, Variants } from "framer-motion";

import { Moon, Sun } from "react-feather";

import styles from "./DarkmodeToggle.module.css";

import { LIGHT_COLORS, DARK_COLORS } from "@/constants";

const loadFeatures = () => import("../../features").then((res) => res.default);

interface DarkmodeToggleProps {
  initialTheme: string;
}

const iconVariants: Variants = {
  hidden: { scale: 0.6 },
  show: { scale: 1 },
  exit: {
    scale: 0.6,
    transition: { duration: 0.1 },
  },
};

function DarkmodeToggle({ initialTheme }: DarkmodeToggleProps) {
  const [theme, setTheme] = useState(initialTheme);

  function handleClick() {
    const nextTheme = theme === "light" ? "dark" : "light";

    setTheme(nextTheme);

    Cookies.set("color-theme", nextTheme, {
      expires: 1000,
    });

    const root = document.documentElement;
    const colors = nextTheme === "light" ? LIGHT_COLORS : DARK_COLORS;

    root.setAttribute("data-color-theme", nextTheme);

    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }

  return (
    <LazyMotion features={loadFeatures}>
      <button aria-label='Darkmode toggle' className={styles.wrapper} onClick={handleClick}>
        <AnimatePresence mode='wait' initial={false}>
          {theme === "light" ? (
            <m.div key={theme} variants={iconVariants} initial={"hidden"} animate={"show"} exit={"exit"}>
              <Sun size='1.5rem' />
            </m.div>
          ) : (
            <m.div key={theme} variants={iconVariants} initial={"hidden"} animate={"show"} exit={"exit"}>
              <Moon size='1.5rem' />
            </m.div>
          )}
        </AnimatePresence>
      </button>
    </LazyMotion>
  );
}

export default DarkmodeToggle;
