import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import {
  recentNotifications,
  unreadCount as countUnreadNotifications,
} from "@/server/services/notification.service";
import { initials } from "@/lib/text";
import { AppHeader, MobileNav } from "@/components/shell/AppShell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [notifications, unreadCount] = await Promise.all([
    recentNotifications(user.id),
    countUnreadNotifications(user.id),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        user={{
          initials: initials(user.name, user.lastName),
          creditBalance: user.creditBalance,
        }}
        notifications={notifications.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          createdAt: item.createdLabel,
          unread: item.unread,
        }))}
        unreadCount={unreadCount}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-4 sm:pb-10">{children}</main>

      <MobileNav />
    </div>
  );
}
