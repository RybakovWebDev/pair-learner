"use client";
import { SOCIAL_LINKS } from "@/constants";
import styles from "./Footer.module.css";

import { useRefsContext } from "@/contexts/RefsContext";
import ExternalLinkIcon from "../ExternalLinkIcon";

function Footer() {
  const { footerRef } = useRefsContext();

  const currentYear = new Date().getFullYear().toString();

  return (
    <footer className={styles.wrapper}>
      <p ref={footerRef}>
        © <time dateTime={currentYear}>{currentYear}</time> Andrey Rybakov
      </p>
      <div className={styles.iconsWrapper}>
        {SOCIAL_LINKS.map((l) => {
          return (
            <ExternalLinkIcon ariaLabel={l.ariaLabelText} key={l.slug} link={l.href}>
              {l.icon}
            </ExternalLinkIcon>
          );
        })}
      </div>
    </footer>
  );
}

export default Footer;
