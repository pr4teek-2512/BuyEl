"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessagesSquare, ShoppingBag, Tag } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import { NotificationBell, type ShellNotification } from "./NotificationBell";

export type ShellUser = {
  initials: string;
  creditBalance: number;
};

export type { ShellNotification };

const tabs = [
  { href: "/buy", label: "Buy", icon: ShoppingBag },
  { href: "/chat", label: "Chat", icon: MessagesSquare },
  { href: "/sell", label: "Sell", icon: Tag },
] as const;

export function AppHeader({
  user,
  notifications,
  unreadCount,
}: {
  user: ShellUser;
  notifications: ShellNotification[];
  unreadCount: number;
}) {

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
        <Link href="/buy" className="text-lg font-semibold tracking-tight">
          Buy<span className="text-brand">El</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/payments"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
            title="Your in-app currency. Tap to buy more."
          >
            {user.creditBalance}
            <span className="text-xs font-medium">credits</span>
          </Link>

          <NotificationBell notifications={notifications} unreadCount={unreadCount} />

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
