import { useState, useEffect } from "react";

const useScreenWidthDetect = (breakpoint: number = 450) => {
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= breakpoint);
    };

    // Check on initial load
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Clean up
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobileView;
};

export default useScreenWidthDetect;
