"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { m, LazyMotion, AnimatePresence } from "framer-motion";

import styles from "./Header.module.css";

import DarkmodeToggle from "@/components/DarkmodeToggle";
import HeaderMenu from "../HeaderMenu";

import { useRefsContext } from "@/contexts/RefsContext";
import { scrollToRef } from "@/helpers";

const loadFeatures = () => import("../../featuresMax").then((res) => res.default);

interface HeaderProps {
  initialTheme: string;
}

function Header({ initialTheme }: HeaderProps) {
  const { headerRef, footerRef } = useRefsContext();

  const router = useRouter();
  const pathname = usePathname();
  const id = useId();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    e.preventDefault();

    if (pathname !== "/") router.push(`/#${slug}`);

    if (pathname === "/") {
      if (slug === "contact") {
        scrollToRef(footerRef);
      }
    }
  };

  return (
    <header ref={headerRef} className={styles.header}>
      <div className={styles.leftWrapper}>
        <Link href={"/"}>
          <h2 className={styles.initials}>Pair Learner</h2>
        </Link>
        <DarkmodeToggle initialTheme={initialTheme} />
      </div>

      <HeaderMenu />
    </header>
  );
}

export default Header;
