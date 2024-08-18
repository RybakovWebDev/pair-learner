"use client";
import { useState } from "react";
import { LazyMotion, m } from "framer-motion";

import styles from "./HeaderMenu.module.css";

import { Menu } from "react-feather";

const loadFeatures = () => import("../../features").then((res) => res.default);

function HeaderMenu() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <LazyMotion features={loadFeatures}>
      <m.div initial={{ rotate: 0 }} animate={{ rotate: isOpen ? 90 : 0 }}>
        <Menu size={32} />
      </m.div>
    </LazyMotion>
  );
}

export default HeaderMenu;
