"use client";
import { donationLinks, SOCIAL_LINKS, supportEmail } from "@/constants";
import styles from "./Footer.module.css";

import { useRefsContext } from "@/contexts/RefsContext";
import ExternalLinkIcon from "../ExternalLinkIcon";

function Footer() {
  const { footerRef } = useRefsContext();

  const currentYear = new Date().getFullYear().toString();

  return (
    <footer className={styles.wrapper}>
      <p className={styles.support}>Support email:</p>
      <p>
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
      </p>

      <div className={styles.donateWrapper}>
        <p>
          {`If you enjoy Pair Learner, you can support me with a donation using `}
          <a href={donationLinks.paypal} target='_blank' rel='noopener noreferrer'>
            PayPal
          </a>
          {` or `}
          <a href={donationLinks.kofi} target='_blank' rel='noopener noreferrer'>
            Ko-Fi
          </a>
          <br />
          ❤️
        </p>
      </div>

      <div className={styles.iconsWrapper}>
        {SOCIAL_LINKS.map((l) => {
          return (
            <ExternalLinkIcon ariaLabel={l.ariaLabelText} key={l.slug} link={l.href}>
              {l.icon}
            </ExternalLinkIcon>
          );
        })}
      </div>
      <p ref={footerRef}>
        © <time dateTime={currentYear}>{currentYear}</time> Andrey Rybakov
      </p>
    </footer>
  );
}

export default Footer;
