import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { canEdit, canView, requireAdmin } from "@/server/auth/adminSession";
import { EmptyState, PageHeading } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { ListingRow, type AdminListingRow } from "./ListingRow";

export const metadata = { title: "Listings - BuyEl admin" };

const PAGE_SIZE = 25;
const STATUSES = ["active", "closed", "deleted", "all"] as const;

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const admin = await requireAdmin();
  if (!canView(admin, "listings")) notFound();
  const editable = canEdit(admin, "listings");

  const params = await searchParams;
  const search = (params.q ?? "").trim();
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? (params.status as (typeof STATUSES)[number])
    : "active";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where = {
    ...(status === "all" ? {} : { status }),
    ...(search
      ? {
          OR: [
            { courseText: { contains: search, mode: "insensitive" as const } },
            { collegeText: { contains: search, mode: "insensitive" as const } },
            { seller: { phone: { contains: search } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { seller: { select: { name: true, lastName: true, phone: true } } },
    }),
    prisma.listing.count({ where }),
  ]);

  const now = new Date();

  const listings: AdminListingRow[] = rows.map((row) => ({
    id: row.id,
    courseText: row.courseText,
    collegeText: row.collegeText,
    sellerName: `${row.seller.name}${row.seller.lastName ? ` ${row.seller.lastName}` : ""}`,
    sellerPhone: row.seller.phone,
    price: row.price,
    status: row.status as AdminListingRow["status"],
    isBoosted: row.isBoosted && row.boostExpiresAt !== null && row.boostExpiresAt > now,
    chatUnlocked: row.chatUnlockedAt !== null,
    chatCount: row.distinctBuyerChatCount,
    createdLabel: row.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  }));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title="Listings"
        description="Moderate what students have put up. Closing or removing a listing notifies the seller."
      />

      <form method="get" action="/admin/listings" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder="Search by course, college or seller phone"
          className={cn(inputClasses, "min-w-56 flex-1")}
          aria-label="Search listings"
        />
        <select
          name="status"
          defaultValue={status}
          className={cn(inputClasses, "w-36")}
          aria-label="Status"
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value === "closed" ? "sold out" : value}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {listings.length === 0 ? (
        <EmptyState title="No listings" description="Nothing matches that search." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <ul className="divide-y divide-line">
            {listings.map((listing) => (
              <ListingRow key={listing.id} listing={listing} editable={editable} />
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span>
          {total} {total === 1 ? "listing" : "listings"}
        </span>
        {pages > 1 ? (
          <span className="flex gap-3">
            {page > 1 ? (
              <Link
                className="text-brand hover:underline"
                href={`/admin/listings?q=${encodeURIComponent(search)}&status=${status}&page=${page - 1}`}
              >
                Previous
              </Link>
            ) : null}
            <span>
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Link
                className="text-brand hover:underline"
                href={`/admin/listings?q=${encodeURIComponent(search)}&status=${status}&page=${page + 1}`}
              >
                Next
              </Link>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}
