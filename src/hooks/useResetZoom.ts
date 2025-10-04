import { useEffect } from "react";

export const useResetZoom = () => {
  useEffect(() => {
    const handleFocus = () => {
      // Set a timeout to allow the zoom to happen before resetting
      setTimeout(() => {
        // Reset zoom
        const viewport = document.querySelector("meta[name=viewport]");
        if (viewport) {
          viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1");
        }
      }, 300);
    };

    const handleBlur = () => {
      // Reset zoom when input loses focus
      const viewport = document.querySelector("meta[name=viewport]");
      if (viewport) {
        viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1");
      }
    };

    // Add event listeners
    document.addEventListener("focus", handleFocus, true);
    document.addEventListener("blur", handleBlur, true);

    return () => {
      document.removeEventListener("focus", handleFocus, true);
      document.removeEventListener("blur", handleBlur, true);
    };
  }, []);
};
