"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

import styles from "./Header.module.css";

import HeaderMenu from "../HeaderMenu";
import Auth from "../Auth";
import Spinner from "../Spinner";
import DarkmodeToggle from "../DarkmodeToggle";

import { useRefsContext } from "@/contexts/RefsContext";
import { useUserContext } from "@/contexts/UserContext";

interface HeaderProps {
  initialTheme: string;
}

function Header({ initialTheme }: HeaderProps) {
  const { headerRef } = useRefsContext();
  const { user, loading } = useUserContext();
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
      {loading ? (
        <Spinner marginTop='0' height='30px' width='30px' borderWidth='2px' />
      ) : user ? (
        <HeaderMenu />
      ) : (
        <Auth openButtonText='Sign In' />
      )}
    </header>
  );
}

export default Header;
