// Browser APIs jsdom doesn't provide but the board components use.
if (typeof window !== "undefined") {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Finish every framer-motion animation instantly. Fake timers don't drive framer's animation clock, so exit animations
// (e.g. the old board fading out before a re-deal) would otherwise never complete. The game's own setTimeout-based
// timings are unaffected.
import { MotionGlobalConfig } from "framer-motion";
MotionGlobalConfig.skipAnimations = true;
