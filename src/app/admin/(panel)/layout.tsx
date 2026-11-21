import { redirect } from "next/navigation";
import { ADMIN_PAGES, canView, getCurrentAdmin } from "@/server/auth/adminSession";
import { countPendingRequests } from "@/server/services/masterlistAdmin.service";
import { countPendingPayments } from "@/server/services/payment.service";
import { AdminMobileNav, AdminSidebar, type AdminNavItem } from "@/components/admin/AdminShell";
import { AdminSignOut } from "./AdminSignOut";

/** Pages that exist today. The rest are listed but disabled until their phase. */
const BUILT: Record<string, string> = {
  dashboard: "/admin",
  master_lists: "/admin/master-lists",
  plans: "/admin/plans",
  payments: "/admin/payments",
  user_access: "/admin/user-access",
  users: "/admin/users",
  listings: "/admin/listings",
  payment_platforms: "/admin/plans",
};

export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const [pending, pendingPayments] = await Promise.all([
    canView(admin, "master_lists") ? countPendingRequests() : Promise.resolve(0),
    canView(admin, "payments") ? countPendingPayments() : Promise.resolve(0),
  ]);

  const items: AdminNavItem[] = ADMIN_PAGES.filter(
    (page) => canView(admin, page.key) && page.key !== "payment_platforms",
  ).map(
    (page) => ({
      href: BUILT[page.key] ?? `/admin/${page.key.replace(/_/g, "-")}`,
      label: page.label,
      pageKey: page.key,
      badge:
        page.key === "master_lists" && pending > 0
          ? pending
          : page.key === "payments" && pendingPayments > 0
            ? pendingPayments
            : undefined,
      available: Boolean(BUILT[page.key]),
    }),
  );

  if (canView(admin, "user_access")) {
    items.push({
      href: "/admin/audit",
      label: "Activity log",
      pageKey: "audit",
      available: true,
    });
  }

  return (
    <div className="flex min-h-dvh bg-surface-soft">
      <AdminSidebar items={items} adminName={admin.name} adminRole={admin.role} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-line bg-white px-4">
          <p className="text-sm font-medium lg:hidden">
            Buy<span className="text-brand">El</span> admin
          </p>
          <div className="ml-auto">
            <AdminSignOut />
          </div>
        </header>

        <AdminMobileNav items={items} />

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
