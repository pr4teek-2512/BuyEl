"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  LayoutDashboard,
  ListChecks,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type AdminNavItem = {
  href: string;
  label: string;
  pageKey: string;
  badge?: number;
  available: boolean;
};

const ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  master_lists: ListChecks,
  payment_platforms: CreditCard,
  plans: QrCode,
  payments: ReceiptText,
  users: Users,
  listings: Tags,
  user_access: ShieldCheck,
};

export function AdminSidebar({
  items,
  adminName,
  adminRole,
}: {
  items: AdminNavItem[];
  adminName: string;
  adminRole: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-line bg-white lg:flex lg:flex-col">
      <div className="border-b border-line px-5 py-4">
        <p className="text-lg font-semibold tracking-tight">
          Buy<span className="text-brand">El</span>
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">Admin panel</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = ICONS[item.pageKey] ?? LayoutDashboard;
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            if (!item.available) {
              return (
                <li key={item.href}>
                  <span
                    className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-muted/60"
                    title="Built in a later phase"
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </span>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-brand-soft font-medium text-brand"
                      : "text-ink-soft hover:bg-surface-soft hover:text-ink",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-danger px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-line px-5 py-4">
        <p className="text-sm font-medium">{adminName}</p>
        <p className="text-xs capitalize text-ink-muted">{adminRole}</p>
      </div>
    </aside>
  );
}

export function AdminMobileNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line bg-white px-3 py-2 lg:hidden">
      {items
        .filter((item) => item.available)
        .map((item) => {
          const active =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
                active ? "bg-brand-soft font-medium text-brand" : "text-ink-soft",
              )}
            >
              {item.label}
              {item.badge ? (
                <span className="ml-1.5 rounded-full bg-danger px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
    </div>
  );
}
