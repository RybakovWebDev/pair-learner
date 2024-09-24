"use client";
import React, { useState, ReactNode, useEffect, useRef, useCallback } from "react";

import styles from "./Sparkles.module.css";

import { random } from "@/helpers";
import { useRandomInterval } from "@/hooks/useRandomInterval";

const DEFAULT_COLOR = "#FFC700";

interface SparkleType {
  id: string;
  createdAt: number;
  color: string;
  size: number;
  style: {
    top: string;
    left: string;
  };
}

interface SparklesProps {
  color?: string;
  children: ReactNode;
  isActive?: boolean;
  [key: string]: any;
}

interface SparkleProps {
  size: number;
  color: string;
  style: React.CSSProperties;
}

const generateSparkle = (color: string): SparkleType => {
  return {
    id: String(random(10000, 99999)),
    createdAt: Date.now(),
    color,
    size: random(20, 30),
    style: {
      top: `${random(10, 60)}%`,
      left: `${random(0, 100)}%`,
    },
  };
};

const Sparkles: React.FC<SparklesProps> = ({ color = DEFAULT_COLOR, children, isActive = true, ...delegated }) => {
  const [sparkles, setSparkles] = useState<SparkleType[]>([]);
  const prefersReducedMotion = useRef(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const updateSparkles = useCallback(() => {
    const now = Date.now();
    setSparkles((currentSparkles) => {
      const nextSparkles = currentSparkles.filter((sp) => {
        const delta = now - sp.createdAt;
        return delta < 750;
      });

      if (isActive && nextSparkles.length < 3) {
        nextSparkles.push(generateSparkle(color));
      }

      return nextSparkles;
    });
  }, [color, isActive]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isActive && !prefersReducedMotion.current) {
      setSparkles([generateSparkle(color)]);
    }
  }, [isActive, color]);

  useRandomInterval({
    callback: updateSparkles,
    minDelay: isActive && !prefersReducedMotion.current ? 150 : null,
    maxDelay: isActive && !prefersReducedMotion.current ? 650 : null,
  });

  return (
    <span className={styles.wrapper} {...delegated}>
      {sparkles.map((sparkle) => (
        <Sparkle key={sparkle.id} color={sparkle.color} size={sparkle.size} style={sparkle.style} />
      ))}
      <strong className={styles.childWrapper}>{children}</strong>
    </span>
  );
};

const Sparkle: React.FC<SparkleProps> = ({ size, color, style }) => {
  const path =
    "M26.5 25.5C19.0043 33.3697 0 34 0 34C0 34 19.1013 35.3684 26.5 43.5C33.234 50.901 34 68 34 68C34 68 36.9884 50.7065 44.5 43.5C51.6431 36.647 68 34 68 34C68 34 51.6947 32.0939 44.5 25.5C36.5605 18.2235 34 0 34 0C34 0 33.6591 17.9837 26.5 25.5Z";

  return (
    <span className={styles.sparkleWrapper} style={style}>
      <svg className={styles.sparkleSvg} width={size} height={size} viewBox='0 0 68 68' fill='none'>
        <path d={path} fill={color} />
      </svg>
    </span>
  );
};

export default Sparkles;
