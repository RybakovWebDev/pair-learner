"use client";
import { useState } from "react";
import { AnimatePresence, LazyMotion, m, Variants } from "framer-motion";

import styles from "./HeaderMenu.module.css";

import { Edit, LogOut, Menu, Play } from "react-feather";
import Link from "next/link";

const loadFeatures = () => import("../../features").then((res) => res.default);

const liVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      delay: 0.2,
    },
  },
  exit: {
    opacity: 0,
  },
};

function HeaderMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    setIsOpen(false);
  };

  return (
    <LazyMotion features={loadFeatures}>
      <nav className={styles.wrapperMain}>
        <m.button
          className={styles.menuButton}
          initial={{ rotate: 0 }}
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <AnimatePresence>
            {isOpen ? (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='32'
                height='32'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                className='feather feather-x'
              >
                <line x1='18' y1='6' x2='6' y2='18'></line>
                <line x1='6' y1='6' x2='18' y2='18'></line>
              </svg>
            ) : (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='32'
                height='32'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                className='feather feather-menu'
              >
                <line x1='3' y1='12' x2='21' y2='12'></line>
                <line x1='3' y1='6' x2='21' y2='6'></line>
                <line x1='3' y1='18' x2='21' y2='18'></line>
              </svg>
            )}
          </AnimatePresence>
        </m.button>
        <AnimatePresence>
          {isOpen && (
            <m.ul
              className={styles.listWrapper}
              initial={{ opacity: 1, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 1, x: "100%" }}
              transition={{ duration: 0.3 }}
            >
              <m.li key={"play"} initial='hidden' animate='show' exit='exit' variants={liVariants}>
                <Link href={"/play"} onClick={() => setIsOpen(false)}>
                  <p>Play</p>
                  <div className={styles.iconWrapper}>
                    <Play size={22} />
                  </div>
                </Link>
              </m.li>
              <m.li key={"edit"} initial='hidden' animate='show' exit='exit' variants={liVariants}>
                <Link href={"/edit"} onClick={() => setIsOpen(false)}>
                  <p>Edit Words</p>
                  <div className={styles.iconWrapper}>
                    <Edit size={22} />
                  </div>
                </Link>
              </m.li>
              <m.li key={"logout"} initial='hidden' animate='show' exit='exit' variants={liVariants}>
                <Link href={"/"} onClick={handleLogout}>
                  <p>Logout</p>
                  <div className={styles.iconWrapper}>
                    <LogOut size={22} />
                  </div>
                </Link>
              </m.li>
            </m.ul>
          )}
        </AnimatePresence>
      </nav>
    </LazyMotion>
  );
}

export default HeaderMenu;
