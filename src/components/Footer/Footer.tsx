"use client";
import styles from "./Footer.module.css";

import { useRefsContext } from "@/contexts/RefsContext";

function Footer() {
  const { footerRef } = useRefsContext();

  const currentYear = new Date().getFullYear().toString();

  return (
    <footer className={styles.wrapper}>
      <p ref={footerRef}>
        © <time dateTime={currentYear}>{currentYear}</time> Andrey Rybakov
      </p>
    </footer>
  );
}

export default Footer;
