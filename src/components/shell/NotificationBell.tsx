"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import { markNotificationsReadAction } from "@/app/(app)/notificationActions";

export type ShellNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
};

/** PRD section 11: the bell shows only the latest 6 notifications. */
export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: ShellNotification[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [dot, setDot] = useState(unreadCount > 0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);

    if (next && dot) {
      setDot(false);
      // Clearing the dot does not need to block the panel from opening.
      void markNotificationsReadAction();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        className="flex size-9 items-center justify-center rounded-full border border-line text-ink-soft hover:text-ink"
      >
        <span className="relative">
          <Bell className="size-[18px]" />
          {dot ? (
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-danger" />
          ) : null}
        </span>
      </button>

      {open ? (
        <div className="animate-fade-up absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-xl shadow-ink/10">
          <p className="border-b border-line px-4 py-2.5 text-sm font-semibold">Notifications</p>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">Nothing yet.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-line overflow-auto">
              {notifications.map((item) => (
                <li key={item.id} className={cn("px-4 py-3", item.unread && "bg-brand-soft/40")}>
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{item.body}</p>
                  <p className="mt-1 text-[11px] text-ink-muted">{item.createdAt}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
