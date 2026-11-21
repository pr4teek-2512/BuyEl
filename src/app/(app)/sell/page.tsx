import { EmptyState, PageHeading } from "@/components/ui/Primitives";
import { SignOutButton } from "./SignOutButton";

export const metadata = { title: "Sell - BuyEl" };

export default function SellPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeading
        title="Sell"
        description="List a course you have registered for. Listing is always free."
        action={<SignOutButton />}
      />
      <EmptyState
        title="Listing creation arrives in the next build step"
        description="Creating, editing, boosting and closing listings is phase 3 of the roadmap."
      />
    </div>
  );
}
