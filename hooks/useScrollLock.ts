import { useEffect } from "react";

/**
 * Hook to lock body scroll when a condition is met.
 * Useful for modals, sidebars, and panels.
 */
export function useScrollLock(isLocked: boolean = true) {
    useEffect(() => {
        // If not locked, do nothing (or unlock if previously locked, handled by cleanup)
        if (!isLocked) return;

        // Save initial style to restore later (optional, but good practice)
        const originalStyle = window.getComputedStyle(document.body).overflow;

        // Add class for locking
        document.body.classList.add("scroll-locked");

        // Cleanup function
        return () => {
            document.body.classList.remove("scroll-locked");
        };
    }, [isLocked]);
}
