"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

import styles from "./Header.module.css";

import DarkmodeToggle from "@/components/DarkmodeToggle";
import HeaderMenu from "../HeaderMenu";
import Auth from "../Auth";

import { useRefsContext } from "@/contexts/RefsContext";
import { useUserContext } from "@/contexts/UserContext";

interface HeaderProps {
  initialTheme: string;
}

function Header({ initialTheme }: HeaderProps) {
  const { headerRef } = useRefsContext();
  const { user } = useUserContext();
  const [storedUser, setStoredUser] = useState<string | null>(null);

  useEffect(() => {
    setStoredUser(localStorage.getItem("user"));
  }, []);

  return (
    <header ref={headerRef} className={styles.header}>
      <div className={styles.leftWrapper}>
        <Link href={"/"}>
          <h2 className={styles.initials}>Pair Learner</h2>
        </Link>
        <DarkmodeToggle initialTheme={initialTheme} />
      </div>
      {user ? <HeaderMenu /> : <Auth />}
      {/* <HeaderMenu /> */}
    </header>
  );
}

export default Header;
