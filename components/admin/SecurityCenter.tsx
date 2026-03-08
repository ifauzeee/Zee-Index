"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Users,
  AlertCircle,
  Fingerprint,
} from "lucide-react";
import { format } from "date-fns";

export default function SecurityCenter() {
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSecurityLogs = async () => {
    try {
      const res = await fetch("/api/admin/logs/security");
      if (res.ok) {
        const data = await res.json();
        setSecurityEvents(data);
      }
    } catch (err) {
      console.error("Failed to fetch security logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityLogs();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-5 border-b pb-3">
          <ShieldCheck className="text-green-500" size={24} />
          <div>
            <h3 className="font-bold text-lg">System Audit Posture</h3>
            <p className="text-sm text-muted-foreground">
              General security status is looking good.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
            <div className="flex items-center gap-3">
              <Lock className="text-muted-foreground" size={18} />
              <span className="text-sm font-medium">Session Policies</span>
            </div>
            <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded">
              Active
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="text-muted-foreground" size={18} />
              <span className="text-sm font-medium">Guest Access Control</span>
            </div>
            <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded">
              Permissive
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
            <div className="flex items-center gap-3">
              <Fingerprint className="text-muted-foreground" size={18} />
              <span className="text-sm font-medium">
                Two-Factor Authentication
              </span>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded">
              Available
            </span>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-5 shadow-sm lg:col-span-1">
        <div className="flex items-center gap-3 mb-5 border-b pb-3">
          <ShieldAlert className="text-red-500" size={24} />
          <div>
            <h3 className="font-bold text-lg">Recent Security Events</h3>
            <p className="text-sm text-muted-foreground">
              Critical and error logs
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <AlertCircle className="animate-pulse text-muted-foreground/30" />
            </div>
          ) : securityEvents.length > 0 ? (
            securityEvents.map((event) => (
              <div
                key={event.id}
                className="flex gap-3 text-sm p-3 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <AlertCircle
                  className="text-red-500 mt-0.5 shrink-0"
                  size={16}
                />
                <div>
                  <p className="font-medium text-foreground">
                    {event.type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-all">
                    User: {event.userEmail || event.ipAddress || "Unknown"}{" "}
                    <br />
                    {format(new Date(event.timestamp), "dd MMM, HH:mm:ss")}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground bg-muted/20 border border-dashed rounded-lg">
              <ShieldCheck
                className="mx-auto mb-2 opacity-50 text-green-500"
                size={32}
              />
              <p className="text-sm">No recent anomalies detected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
