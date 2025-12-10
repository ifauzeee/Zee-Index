import { useEffect } from "react";

export function useScrollLock(isLocked: boolean = true) {
  useEffect(() => {
    if (!isLocked) return;
    document.body.classList.add("scroll-locked");
    return () => {
      document.body.classList.remove("scroll-locked");
    };
  }, [isLocked]);
}
