import "server-only";
import { prisma } from "@/server/db";
import type { NotificationType } from "@/generated/prisma/enums";

/**
 * Website notifications (PRD section 6 and 11). The header bell shows only the
 * latest 6, which is the number the PRD asks for.
 */
export const BELL_LIMIT = 6;

export type NotificationView = {
  id: string;
  title: string;
  body: string;
  createdLabel: string;
  unread: boolean;
};

export async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  refId?: string | null;
}) {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      refId: params.refId ?? null,
    },
  });
}

export async function recentNotifications(userId: string): Promise<NotificationView[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: BELL_LIMIT,
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    createdLabel: row.createdAt.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    unread: row.readAt === null,
  }));
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/** Called when the bell is opened. Only clears what is currently on screen. */
export async function markNotificationsRead(userId: string) {
  const latest = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: BELL_LIMIT,
    select: { id: true },
  });

  if (latest.length === 0) return;

  await prisma.notification.updateMany({
    where: { id: { in: latest.map((row) => row.id) }, readAt: null },
    data: { readAt: new Date() },
  });
}
