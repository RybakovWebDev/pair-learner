"use client";
import { createContext, ReactNode, useEffect, useState } from "react";
import { m } from "framer-motion";

/** True inside content that's fading out, so cells there render as non-interactive ghosts. */
export const LeavingContext = createContext(false);

interface FadeOutSwapProps {
  /** Changing this swaps the content: the old content fades out first, then the new content shows. */
  contentKey: string;
  durationMs: number;
  children: ReactNode;
}

// Works like <AnimatePresence mode="wait">, except the swap happens on our own timer instead of waiting for the exit
// animation to report that it finished. If an animation ever stalls, the new content still shows on time.
function FadeOutSwap({ contentKey, durationMs, children }: FadeOutSwapProps) {
  // The latest content shown for the current key, so it can be shown fading out after the key changes.
  const [current, setCurrent] = useState({ key: contentKey, node: children });
  const [leaving, setLeaving] = useState<{ key: string; node: ReactNode } | null>(null);

  if (current.key !== contentKey) {
    if (!leaving) setLeaving(current); // a second swap during a fade-out doesn't restart it
    setCurrent({ key: contentKey, node: children });
  } else if (current.node !== children) {
    setCurrent({ key: contentKey, node: children });
  }

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(null), durationMs);
    return () => clearTimeout(timer);
  }, [leaving, durationMs]);

  // The leaving content stays in the same element (same key), so React doesn't remount it. A remount would replay the
  // content's own fade-in while this wrapper fades it out, which shows as a pause halfway through the fade.
  const shown = leaving ?? { key: contentKey, node: children };
  return (
    <LeavingContext.Provider value={leaving !== null}>
      <m.div
        key={shown.key}
        inert={leaving !== null}
        aria-hidden={leaving !== null || undefined}
        initial={false}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: leaving ? durationMs / 1000 : 0 }}
      >
        {shown.node}
      </m.div>
    </LeavingContext.Provider>
  );
}

export default FadeOutSwap;
