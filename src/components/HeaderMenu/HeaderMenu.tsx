"use client";
import { useState } from "react";
import { AnimatePresence, LazyMotion, m, Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

import styles from "./HeaderMenu.module.css";

import { LogOut } from "react-feather";

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
  const router = useRouter();
  const { setUser } = useUserContext();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
    setIsOpen(false);
  };

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <LazyMotion features={loadFeatures}>
      <nav className={styles.wrapperMain}>
        <m.button className={styles.menuButton} onClick={() => setIsOpen(!isOpen)}>
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
              className={styles.list}
              initial={{ opacity: 1, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 1, x: "100%" }}
              transition={{ duration: 0.3 }}
            >
              {MENU_ITEMS.map((item) => (
                <m.li key={item.slug} initial='hidden' animate='show' exit='exit' variants={liVariants}>
                  <Link href={item.href} onClick={handleLinkClick}>
                    <p>{item.title}</p>
                    <div className={styles.iconWrapper}>{item.icon}</div>
                  </Link>
                </m.li>
              ))}

              <m.li key='logout' initial='hidden' animate='show' exit='exit' variants={liVariants}>
                <button onClick={handleLogout}>
                  <p>Logout</p>
                  <div className={styles.iconWrapper}>
                    <LogOut size={22} />
                  </div>
                </button>
              </m.li>
            </m.ul>
          )}
        </AnimatePresence>
      </nav>
    </LazyMotion>
  );
}

export default HeaderMenu;
