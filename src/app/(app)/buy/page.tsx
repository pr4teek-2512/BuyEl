import { EmptyState, PageHeading } from "@/components/ui/Primitives";

export const metadata = { title: "Buy - BuyEl" };

export default function BuyPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeading
        title="Buy"
        description="Course seats listed by other students at your university."
      />
      <EmptyState
        title="Listings arrive in the next build step"
        description="The Available and Sold Out tabs, search, and the ordering rules are phase 3 of the roadmap. Your account, profile and sign in are live now."
      />
    </div>
  );
}
