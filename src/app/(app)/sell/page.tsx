import { requireUserForPage } from "@/server/auth/session";
import { listSellerListings } from "@/server/services/listing.service";
import {
  listActivePlatforms,
  listPayablePlans,
  pendingRequestFor,
} from "@/server/services/payment.service";
import { describePlan } from "@/server/services/payment.rules";
import { EmptyState, PageHeading } from "@/components/ui/Primitives";
import { CreateListingForm } from "./CreateListingForm";
import { SellListingCard } from "./SellListingCard";
import { SignOutButton } from "./SignOutButton";

export const metadata = { title: "Sell - BuyEl" };

function shortDate(date: Date) {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default async function SellPage() {
  const user = await requireUserForPage();
  const [listings, unlockPlans, boostPlans, platforms] = await Promise.all([
    listSellerListings(user.id),
    listPayablePlans("seller_chat_unlock"),
    listPayablePlans("boost"),
    listActivePlatforms(),
  ]);

  const toOption = (plan: (typeof unlockPlans)[number]) => ({
    id: plan.id,
    label: plan.label,
    description: describePlan({
      category: plan.category,
      label: plan.label,
      price: plan.price,
      creditsGranted: plan.creditsGranted,
      boostDays: plan.boostDays,
    }),
    price: plan.price,
    qrImageUrl: plan.qrImageUrl,
    qrUpiId: plan.qrUpiId,
  });

  const platformOptions = platforms.map((platform) => ({
    id: platform.id,
    name: platform.name,
    logoUrl: platform.logoUrl,
    utrTerm: platform.utrTerm,
    appTxnTerm: platform.appTxnTerm,
    explanatoryImageUrl: platform.explanatoryImageUrl,
  }));

  // A listing with a payment already waiting shows that instead of a pay button.
  const pendingByListing = new Map<string, { unlock: boolean; boost: boolean }>();
  for (const listing of listings) {
    const [unlock, boost] = await Promise.all([
      pendingRequestFor(user.id, "listing_unlock", listing.id),
      pendingRequestFor(user.id, "listing_boost", listing.id),
    ]);
    pendingByListing.set(listing.id, { unlock: Boolean(unlock), boost: Boolean(boost) });
  }

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
                unlockPlans={unlockPlans.map(toOption)}
                boostPlans={boostPlans.map(toOption)}
                platforms={platformOptions}
                pendingUnlock={pendingByListing.get(listing.id)?.unlock ?? false}
                pendingBoost={pendingByListing.get(listing.id)?.boost ?? false}
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
