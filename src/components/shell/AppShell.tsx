"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, MessagesSquare, ShoppingBag, Tag } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";

export type ShellUser = {
  initials: string;
  creditBalance: number;
};

export type ShellNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
};

const tabs = [
  { href: "/buy", label: "Buy", icon: ShoppingBag },
  { href: "/chat", label: "Chat", icon: MessagesSquare },
  { href: "/sell", label: "Sell", icon: Tag },
] as const;

export function AppHeader({
  user,
  notifications,
}: {
  user: ShellUser;
  notifications: ShellNotification[];
}) {
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
        <Link href="/buy" className="text-lg font-semibold tracking-tight">
          Buy<span className="text-brand">El</span>
        </Link>

        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-sm font-semibold text-brand"
            title="Your in-app currency"
          >
            {user.creditBalance}
            <span className="text-xs font-medium">credits</span>
          </span>

          <details className="relative">
            <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full border border-line text-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden">
              <span className="relative">
                <Bell className="size-[18px]" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-danger" />
                ) : null}
              </span>
            </summary>

            <div className="animate-fade-up absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-white shadow-xl shadow-ink/10">
              <p className="border-b border-line px-4 py-2.5 text-sm font-semibold">
                Notifications
              </p>
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink-muted">
                  Nothing yet.
                </p>
              ) : (
                <ul className="max-h-80 divide-y divide-line overflow-auto">
                  {notifications.map((item) => (
                    <li
                      key={item.id}
                      className={cn("px-4 py-3", item.unread && "bg-brand-soft/40")}
                    >
                      <p className="text-sm font-medium text-ink">{item.title}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">{item.body}</p>
                      <p className="mt-1 text-[11px] text-ink-muted">{item.createdAt}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>

          <Avatar initials={user.initials} size="sm" />
        </div>
      </div>

      <nav className="mx-auto hidden w-full max-w-3xl gap-1 px-4 pb-2 sm:flex">
        <DesktopTabs />
      </nav>
    </header>
  );
}

function DesktopTabs() {
  const pathname = usePathname();
  return (
    <>
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-brand-soft text-brand" : "text-ink-soft hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </>
  );
}

/** Mobile bottom bar. PRD section 11: the mobile view behaves like an app. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className="mx-auto flex w-full max-w-3xl">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  active ? "text-brand" : "text-ink-muted",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
