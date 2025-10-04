"use client";
import { useState, useEffect } from "react";

interface ViewportSize {
  width: number | undefined;
  height: number | undefined;
}

function useViewportSize() {
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: undefined, height: undefined });

  useEffect(() => {
    setViewportSize({ width: window.innerWidth, height: window.innerHeight });

    const handleResize = () => setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return viewportSize;
}

export default useViewportSize;
