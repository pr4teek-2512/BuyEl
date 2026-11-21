import Link from "next/link";
import { Lock } from "lucide-react";
import { requireUserForPage } from "@/server/auth/session";
import { listThreads } from "@/server/services/chat.service";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, PageHeading } from "@/components/ui/Primitives";
import { cn } from "@/lib/cn";

export const metadata = { title: "Chat - BuyEl" };

const TABS = [
  { key: "buy", label: "Buy Chats" },
  { key: "sell", label: "Sell Chats" },
] as const;

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUserForPage();
  const params = await searchParams;
  const tab = TABS.find((t) => t.key === params.tab)?.key ?? "buy";

  const threads = await listThreads(user.id, tab === "buy" ? "buyer" : "seller");

  return (
    <div className="flex flex-col gap-4">
      <PageHeading
        title="Chat"
        description="Names and numbers are never shown. You both see only initials."
      />

      <nav className="flex gap-1 border-b border-line">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/chat?tab=${item.key}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm transition-colors",
              item.key === tab
                ? "border-brand font-medium text-brand"
                : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {threads.length === 0 ? (
        <EmptyState
          title={tab === "buy" ? "You have not contacted anyone yet" : "No buyers yet"}
          description={
            tab === "buy"
              ? "Find a course on the Buy tab and tap Chat to reach the student selling it."
              : "When a buyer starts a conversation about one of your listings, it appears here."
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {threads.map((thread) => (
            <li key={thread.id}>
              <Link
                href={`/chat/${thread.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 transition-colors hover:border-line-strong"
              >
                <Avatar initials={thread.counterpartInitials} />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{thread.courseText}</p>
                  <p className="mt-0.5 truncate text-sm text-ink-muted">
                    {thread.locked ? (
                      <span className="inline-flex items-center gap-1">
                        <Lock className="size-3.5" />
                        Unlock chat to read this
                      </span>
                    ) : (
                      (thread.lastMessagePreview ?? "No messages yet")
                    )}
                  </p>
                </div>

                {thread.unread ? <span className="size-2 shrink-0 rounded-full bg-brand" /> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
