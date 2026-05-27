"use client";

import { useState, useEffect } from "react";
import { Bell, CheckSquare, Siren, Trash2, MailCheck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClientBrowser } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  unread: boolean;
  createdAt: string;
  metadata?: any;
};

export function NotificationDropdown() {
  const { user } = useAuth();
  const supabase = createClientBrowser();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [isOpen, setIsOpen] = useState(false);

  // Fetch initial notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await fetch("/api/notifications");
      const data = await response.json();
      if (response.ok && data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Subscribe to real-time notifications
      const channel = supabase
        .channel(`web_notifs_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Realtime notification change received:", payload);
            if (payload.eventType === "INSERT") {
              setNotifications((prev) => [payload.new as Notification, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setNotifications((prev) =>
                prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n))
              );
            } else if (payload.eventType === "DELETE") {
              setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
        );
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering details popover clicks
    try {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
      });
      if (response.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  // Determine unread count to show on the bell icon
  const unreadCount = notifications.filter((n) => n.unread).length;
  const hasUnread = unreadCount > 0;

  const filteredNotifications = notifications.filter((n) =>
    tab === "all" ? true : n.unread
  );

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2.5 text-[#64748B] hover:text-[#1E3A8A] transition-colors focus:outline-none">
          <Bell className="size-7" />
          {hasUnread && (
            <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[450px] p-0 rounded-2xl shadow-xl overflow-hidden border-slate-100 bg-white"
      >
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[#1E3A8A] font-bold text-sm tracking-wide">NOTIFICATIONS</h2>
            {notifications.length > 0 && (
              <div className="flex gap-4">
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-semibold text-[#1E3A8A] hover:underline flex items-center gap-1"
                >
                  <MailCheck className="size-3.5" /> Mark all read
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="size-3.5" /> Clear all
                </button>
              </div>
            )}
          </div>

          <div className="flex p-1 bg-slate-50 rounded-lg mb-4 border border-slate-100">
            <button
              onClick={() => setTab("all")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                tab === "all" ? "bg-[#1E3A8A] text-white" : "text-[#1E3A8A] hover:bg-slate-100"
              }`}
            >
              ALL ({notifications.length})
            </button>
            <button
              onClick={() => setTab("unread")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                tab === "unread" ? "bg-[#1E3A8A] text-white" : "text-[#1E3A8A] hover:bg-slate-100"
              }`}
            >
              UNREAD ({unreadCount})
            </button>
          </div>

          <div className="flex flex-col gap-1 max-h-[350px] overflow-y-auto pr-1">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm font-medium">
                No notifications found.
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => notification.unread && handleMarkAsRead(notification.id)}
                  className={`group flex gap-4 p-3 rounded-xl transition-all cursor-pointer ${
                    notification.unread ? "bg-blue-50/40 hover:bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="shrink-0 mt-1">
                    {notification.type === "new_incident" || notification.type === "registration_pending" ? (
                      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                        <Siren className="size-5 text-red-500" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <CheckSquare className="size-5 text-[#1E3A8A]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm text-slate-900 leading-tight">
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-slate-400">
                          {formatTime(notification.createdAt)}
                        </span>
                        {notification.unread && (
                          <div className="size-2 rounded-full bg-red-600 shrink-0" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pr-6">
                      {notification.body}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded-md transition-all self-center shrink-0"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
