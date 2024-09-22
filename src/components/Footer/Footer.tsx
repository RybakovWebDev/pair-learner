"use client";
import { SOCIAL_LINKS, supportEmail } from "@/constants";
import styles from "./Footer.module.css";

import { useRefsContext } from "@/contexts/RefsContext";
import ExternalLinkIcon from "../ExternalLinkIcon";

function Footer() {
  const { footerRef } = useRefsContext();

  const currentYear = new Date().getFullYear().toString();

  return (
    <footer className={styles.wrapper}>
      <p>Support:</p>
      <p>
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
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
      <p ref={footerRef} className={styles.name}>
        © <time dateTime={currentYear}>{currentYear}</time> Andrey Rybakov
      </p>
    </footer>
  );
}

export default Footer;
