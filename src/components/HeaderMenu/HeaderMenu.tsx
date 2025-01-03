"use client";
import { useState } from "react";
import { AnimatePresence, LazyMotion, m, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import Link from "next/link";

import styles from "./HeaderMenu.module.css";

import { Check, LogOut, X } from "react-feather";

import { useUserContext } from "@/contexts/UserContext";
import { MENU_ITEMS } from "@/constants";

const loadFeatures = () => import("../../features").then((res) => res.default);

const liVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delay: 0.2 } },
  exit: { opacity: 0 },
};

const Path = (props: any) => (
  <m.path fill='transparent' strokeWidth='1.5' stroke='currentColor' strokeLinecap='round' {...props} />
);

function HeaderMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const router = useRouter();
  const { setUser } = useUserContext();

  const handleMenuOpen = () => {
    setIsOpen(!isOpen);
    setLogoutConfirm(false);
  };

  const handleInitiateLogout = () => {
    setLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
    setIsOpen(false);
    setLogoutConfirm(false);
  };

  const handleCancelLogout = () => {
    setLogoutConfirm(false);
  };

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <LazyMotion features={loadFeatures}>
      <nav className={styles.wrapperMain}>
        <m.button
          className={styles.menuButton}
          onClick={handleMenuOpen}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          aria-controls='header-menu'
        >
          <svg width='30' height='30' viewBox='0 0 23 23'>
            <Path
              initial={{ d: "M 2 2.5 L 20 2.5" }}
              variants={{
                closed: { d: "M 2 2.5 L 20 2.5" },
                open: { d: "M 3 16.5 L 17 2.5" },
              }}
              animate={isOpen ? "open" : "closed"}
            />
            <Path
              initial={{ opacity: 1, d: "M 2 9.423 L 20 9.423" }}
              d='M 2 9.423 L 20 9.423'
              variants={{
                closed: { opacity: 1 },
                open: { opacity: 0 },
              }}
              transition={{ duration: 0.1 }}
              animate={isOpen ? "open" : "closed"}
            />
            <Path
              initial={{ d: "M 2 16.346 L 20 16.346" }}
              variants={{
                closed: { d: "M 2 16.346 L 20 16.346" },
                open: { d: "M 3 2.5 L 17 16.346" },
              }}
              animate={isOpen ? "open" : "closed"}
            />
          </svg>
        </m.button>

        <AnimatePresence>
          {isOpen && (
            <m.ul
              id='header-menu'
              role='menu'
              className={styles.list}
              initial={{ opacity: 1, x: "100vw" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 1, x: "100vw" }}
              transition={{ duration: 0.3 }}
            >
              {MENU_ITEMS.map((item) => (
                <m.li key={item.slug} role='none' initial='hidden' animate='show' exit='exit' variants={liVariants}>
                  <Link
                    role='menuitem'
                    href={item.href}
                    onKeyDown={(e) => {
                      if (e.key === " ") {
                        e.preventDefault();
                        e.currentTarget.click();
                      }
                    }}
                    onClick={handleLinkClick}
                  >
                    <p>{item.title}</p>
                    <div className={styles.iconWrapper}>{item.icon}</div>
                  </Link>
                </m.li>
              ))}

              <m.li key='logout' role='none' initial='hidden' animate='show' exit='exit' variants={liVariants}>
                <div
                  role='menuitem'
                  className={styles.logoutWrapper}
                  onClick={!logoutConfirm ? handleInitiateLogout : undefined}
                  style={{ cursor: logoutConfirm ? "default" : "pointer" }}
                >
                  <AnimatePresence mode='wait' initial={false}>
                    {logoutConfirm ? (
                      <m.p key={"areyousure"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        Are you sure?
                      </m.p>
                    ) : (
                      <m.p key='logouttext' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        Logout
                      </m.p>
                    )}
                  </AnimatePresence>

                  <m.div
                    className={styles.iconWrapper}
                    initial={{ width: "4rem" }}
                    animate={{
                      width: logoutConfirm ? "5rem" : "2.5rem",
                    }}
                    transition={{
                      width: { duration: 0.3 },
                    }}
                  >
                    <AnimatePresence mode='wait'>
                      {logoutConfirm ? (
                        <m.div
                          key={"confrimButtons"}
                          className={styles.pairControlButtonWrapper}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <m.div
                            className={styles.iconInnerWrapper}
                            onClick={handleConfirmLogout}
                            initial={{ backgroundColor: "var(--color-background)" }}
                            whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                          >
                            <Check size={22} />
                          </m.div>
                          <span />
                          <m.div
                            className={styles.iconInnerWrapper}
                            onClick={handleCancelLogout}
                            initial={{ backgroundColor: "var(--color-background)" }}
                            whileTap={{ backgroundColor: "var(--color-background-highlight)" }}
                          >
                            <X size={22} />
                          </m.div>
                        </m.div>
                      ) : (
                        <m.div
                          key={"startLogoutButton"}
                          className={styles.iconInnerWrapper}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <LogOut size={22} />
                        </m.div>
                      )}
                    </AnimatePresence>
                  </m.div>
                </div>
              </m.li>
            </m.ul>
          )}
        </AnimatePresence>
      </nav>
    </LazyMotion>
  );
}

export default HeaderMenu;
