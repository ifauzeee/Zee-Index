"use client";

import { useState, useEffect } from "react";
import { Users, Activity, Eye, MousePointerClick } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function RealTimeOverview() {
  const [activeUsers, setActiveUsers] = useState(1);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const { notifications } = useAppStore();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers((prev) => {
        const change = Math.floor(Math.random() * 3) - 1;
        const next = prev + change;
        return next > 0 ? next : 1;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setRecentEvents(notifications.slice(0, 5));
    if (notifications.length > 0) setActiveUsers((prev) => prev + 1);
  }, [notifications]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="col-span-1 border rounded-xl shadow-sm bg-card p-4">
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium">Active Users</h3>
          <div className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
        </div>
        <div>
          <div className="text-3xl font-bold">{activeUsers}</div>
          <p className="text-xs text-muted-foreground mt-1">Currently online</p>
        </div>
      </div>

      <div className="col-span-1 lg:col-span-3 border rounded-xl shadow-sm bg-muted/20 p-4">
        <div className="flex flex-row items-center gap-2 pb-2">
          <Activity className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-medium">Live Feed</h3>
        </div>
        <div className="px-2 py-2">
          <div className="space-y-3 relative overflow-hidden h-[120px]">
            <AnimatePresence>
              {recentEvents.length > 0 ? (
                recentEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 text-sm border-b pb-2 last:border-0"
                  >
                    <span className="text-muted-foreground text-xs font-mono w-16 flex-shrink-0">
                      {format(new Date(event.timestamp), "HH:mm:ss")}
                    </span>
                    <div className="flex-1 truncate">{event.message}</div>
                  </motion.div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground flex items-center justify-center h-full">
                  Waiting for events...
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
