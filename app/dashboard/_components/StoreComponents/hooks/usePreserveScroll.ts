"use client";

import { useEffect, useRef } from "react";

export function usePreserveScroll() {
  const scrollYRef = useRef<number>(0);

  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY || 0;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const preserveScroll = (fn: () => void) => {
    const y = scrollYRef.current || window.scrollY || 0;
    fn();
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: "auto" });
    });
  };

  return { preserveScroll, scrollYRef };
}
