import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { ChatError, getConversation } from "@/server/services/chat.service";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Primitives";
import { Conversation } from "./Conversation";

export const metadata = { title: "Conversation - BuyEl" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const user = await requireUser();
  const { threadId } = await params;

  let conversation;
  try {
    conversation = await getConversation(user.id, threadId);
  } catch (error) {
    if (error instanceof ChatError) notFound();
    throw error;
  }

  const { view, role, messages, waitingMessageCount } = conversation;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/chat?tab=${role === "buyer" ? "buy" : "sell"}`}
          className="text-ink-muted hover:text-ink"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar initials={view.counterpartInitials} />
        <div className="min-w-0">
          <p className="truncate font-medium">{view.courseText}</p>
          <p className="text-xs text-ink-muted">
            {role === "buyer" ? "You are the buyer" : "You are the seller"}
          </p>
        </div>
      </div>

      {view.locked ? (
        <Card className="flex flex-col items-start gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Lock className="size-5" />
          </span>
          <div>
            <p className="font-medium">Chat is locked for this listing</p>
            <p className="mt-1 text-sm text-ink-muted">
              {waitingMessageCount === 0
                ? "A buyer has started a conversation about this listing."
                : `${waitingMessageCount} ${waitingMessageCount === 1 ? "message is" : "messages are"} waiting for you.`}{" "}
              Unlock chat for this listing to read and reply. You only pay once per listing.
            </p>
          </div>
          <Button disabled title="Paid unlock arrives with the payment step.">
            <Lock className="size-4" />
            Unlock chat
          </Button>
        </Card>
      ) : (
        <Conversation threadId={threadId} initialMessages={messages} />
      )}
    </div>
  );
}
