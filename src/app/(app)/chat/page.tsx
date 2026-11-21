import { EmptyState, PageHeading } from "@/components/ui/Primitives";

export const metadata = { title: "Chat - BuyEl" };

export default function ChatPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeading
        title="Chat"
        description="Your buyer and seller conversations, always anonymous."
      />
      <EmptyState
        title="Chat arrives in the next build step"
        description="Buy Chats, Sell Chats and realtime messaging are phase 4 of the roadmap, together with the credit ledger."
      />
    </div>
  );
}
