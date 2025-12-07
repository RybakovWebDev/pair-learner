"use client";
import { createContext, useRef, useContext, RefObject, ReactNode } from "react";

interface RefsContextType {
  headerRef: RefObject<HTMLElement | null>;
  footerRef: RefObject<HTMLParagraphElement | null>;
}

const defaultValue: RefsContextType = {
  headerRef: { current: null },
  footerRef: { current: null },
};

const RefsContext = createContext<RefsContextType>(defaultValue);

export function RefsProvider({ children }: { children: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLParagraphElement>(null);

  return <RefsContext.Provider value={{ headerRef, footerRef }}>{children}</RefsContext.Provider>;
}

export function useRefsContext() {
  return useContext(RefsContext);
}
