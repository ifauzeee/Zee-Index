"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Silent page view tracker that fires a beacon on each route change.
 * Place this in the root layout to track all page navigation.
 */
export default function PageViewTracker() {
    const pathname = usePathname();
    const lastPathRef = useRef<string>("");

    useEffect(() => {

        if (
            pathname.startsWith("/api") ||
            pathname.startsWith("/_next") ||
            pathname.includes("/static/")
        ) {
            return;
        }


        if (pathname === lastPathRef.current) return;
        lastPathRef.current = pathname;


        const track = async () => {
            try {
                await fetch("/api/admin/analytics/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        path: pathname,
                        referrer: document.referrer || "",
                    }),

                    keepalive: true,
                });
            } catch {

            }
        };


        const timer = setTimeout(track, 300);
        return () => clearTimeout(timer);
    }, [pathname]);

    return null;
}
