"use client";
import React from "react";
import { AnimatePresence, m, Variants } from "framer-motion";

import styles from "./GameTagFilter.module.css";

import { ChevronDown, Check } from "react-feather";

import { controlsVariants, Tag } from "@/constants";

interface GameTagFilterProps {
  tags: Tag[];
  enabledTags: string[];
  isOpen: boolean;
  isDisabled: boolean;
  onToggleOpen: () => void;
  onTagChange: (tagId: string) => void;
}

const categoriesUlVariants: Variants = {
  hidden: { height: 0 },
  show: { height: "auto" },
  exit: { height: 0 },
};

function GameTagFilter({ tags, enabledTags, isOpen, isDisabled, onToggleOpen, onTagChange }: GameTagFilterProps) {
  return (
    <m.div className={styles.tagsWrapper} variants={controlsVariants} animate={isDisabled ? "disabled" : "enabled"}>
      <div className={styles.tagsLabelWrapper} onClick={onToggleOpen}>
        <p>Filter by tags:</p>
        <AnimatePresence mode='wait'>
          <m.p
            key={enabledTags.length === 0 ? "All" : "Custom"}
            className={styles.tagsSelection}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {enabledTags.length === 0 ? "All" : "Custom"}
          </m.p>
        </AnimatePresence>
        <m.div initial={{ rotate: 0 }} animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronDown />
        </m.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <m.ul initial='hidden' animate='show' exit='hidden' variants={categoriesUlVariants}>
            {tags.map((tag: Tag) => (
              <li className={styles.tagListItem} key={tag.id} onClick={() => onTagChange(tag.id)}>
                <m.div className={styles.checkWrapperOuter}>
                  <m.div initial={{ opacity: 0 }} animate={{ opacity: enabledTags.includes(tag.id) ? 1 : 0 }}>
                    <Check />
                  </m.div>
                </m.div>
                <p>{tag.name}</p>
              </li>
            ))}
          </m.ul>
        )}
      </AnimatePresence>
    </m.div>
  );
}

export default GameTagFilter;
