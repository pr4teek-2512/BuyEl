import { requireUser } from "@/server/auth/session";
import { listSellerListings } from "@/server/services/listing.service";
import { EmptyState, PageHeading } from "@/components/ui/Primitives";
import { CreateListingForm } from "./CreateListingForm";
import { SellListingCard } from "./SellListingCard";
import { SignOutButton } from "./SignOutButton";

export const metadata = { title: "Sell - BuyEl" };

function shortDate(date: Date) {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default async function SellPage() {
  const user = await requireUser();
  const listings = await listSellerListings(user.id);

  return (
    <div className="flex flex-col gap-4">
      <PageHeading
        title="Sell"
        description="List a course you have registered for. Listing is always free."
        action={<SignOutButton />}
      />

      <CreateListingForm defaultCollege={user.collegeText} />

      {listings.length === 0 ? (
        <EmptyState
          title="You have not listed anything yet"
          description="Put up a course you secured and students looking for it will be able to reach you."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <SellListingCard
                listing={{
                  id: listing.id,
                  courseText: listing.courseText,
                  collegeText: listing.collegeText,
                  collegeAbbreviation: listing.collegeAbbreviation,
                  price: listing.price,
                  status: listing.status,
                  chatUnlocked: listing.chatUnlocked,
                  isBoosted: listing.isBoosted,
                  boostExpiresLabel:
                    listing.isBoosted && listing.boostExpiresAt
                      ? shortDate(listing.boostExpiresAt)
                      : null,
                  distinctBuyerChatCount: listing.distinctBuyerChatCount,
                  createdLabel: shortDate(listing.createdAt),
                  rank: listing.rank,
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
