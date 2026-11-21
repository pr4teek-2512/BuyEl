import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { initials } from "@/lib/text";
import { AppHeader, MobileNav } from "@/components/shell/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // PRD section 11: the bell shows only the latest 6 notifications.
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

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
          createdAt: item.createdAt.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          unread: item.readAt === null,
        }))}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-4 sm:pb-10">{children}</main>

      <MobileNav />
    </div>
  );
}
