import { useCallback, useEffect, useRef } from "react";

import { random } from "@/helpers";

interface UseRandomIntervalProps {
  callback: () => void;
  minDelay: number | null;
  maxDelay: number | null;
}

export function useRandomInterval({ callback, minDelay, maxDelay }: UseRandomIntervalProps): () => void {
  const timeoutId = useRef<number | null>(null);
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const isEnabled = typeof minDelay === "number" && typeof maxDelay === "number";
    if (isEnabled) {
      const handleTick = () => {
        const nextTickAt = random(minDelay, maxDelay);
        timeoutId.current = window.setTimeout(() => {
          savedCallback.current();
          handleTick();
        }, nextTickAt);
      };
      handleTick();
    }
    return () => {
      if (timeoutId.current !== null) {
        window.clearTimeout(timeoutId.current);
      }
    };
  }, [minDelay, maxDelay]);

  const cancel = useCallback(() => {
    if (timeoutId.current !== null) {
      window.clearTimeout(timeoutId.current);
    }
  }, []);

  return cancel;
}
