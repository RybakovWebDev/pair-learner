import { ReactNode } from "react";
import { m, LazyMotion } from "framer-motion";

import styles from "./ExternalLinkIcon.module.css";

import { smoothSpring } from "@/constants";

const loadFeatures = () => import("../../features").then((res) => res.default);

interface ExternalLinkIconProps {
  link: string;
  ariaLabel: string;
  children: ReactNode;
}

function ExternalLinkIcon({ link, ariaLabel, children, ...props }: ExternalLinkIconProps) {
  return (
    <LazyMotion features={loadFeatures}>
      <m.a
        className={styles.link}
        target='_blank'
        rel='noopener noreferrer'
        href={link}
        aria-label={ariaLabel}
        whileHover={{
          y: -10,
        }}
        transition={smoothSpring}
        {...props}
      >
        {children}
      </m.a>
    </LazyMotion>
  );
}

export default ExternalLinkIcon;
