import { useRef, useState, useEffect } from "react";
import { m, Variants } from "framer-motion";

interface AnimateChangeInHeightProps {
  children: React.ReactNode;
  className?: string;
  classNameInner?: string;
  enterDuration?: number;
  enterDelay?: number;
  exitDuration?: number;
  exitDelay?: number;
}

export const scrollToRef = (ref: React.RefObject<HTMLElement>): void => {
  ref.current?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
};

export const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const makeid = (length: number) => {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

export const AnimateChangeInHeight: React.FC<AnimateChangeInHeightProps> = ({
  children,
  className,
  classNameInner,
  enterDuration = 0.3,
  enterDelay = 0,
  exitDuration = 0.3,
  exitDelay = 0,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const [prevHeight, setPrevHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const observedHeight = entries[0].contentRect.height;
        setPrevHeight(height);
        setHeight(observedHeight);
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [height]);

  const isGrowing = (prevHeight: number | "auto", height: number | "auto") => {
    if (typeof prevHeight === "number" && typeof height === "number") {
      return height > prevHeight;
    }
    return prevHeight === "auto" || height !== 0;
  };

  const variants: Variants = {
    show: {
      height,
      transition: {
        duration: isGrowing(prevHeight, height) ? enterDuration : exitDuration,
        delay: isGrowing(prevHeight, height) ? enterDelay : exitDelay,
      },
    },
  };

  return (
    <m.div className={className} style={{ height }} variants={variants} initial='hidden' animate='show'>
      <div className={classNameInner} ref={containerRef}>
        {children}
      </div>
    </m.div>
  );
};

export const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const range = (start: number, end?: number, step = 1): number[] => {
  let output: number[] = [];

  if (end === undefined) {
    end = start;
    start = 0;
  }

  for (let i = start; i < end; i += step) {
    output.push(i);
  }

  return output;
};

export const random = (min: number, max: number): number => Math.floor(Math.random() * (max - min)) + min;
