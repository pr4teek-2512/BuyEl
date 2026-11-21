import Link from "next/link";
import { notFound } from "next/navigation";
import { canEdit, canView, requireAdmin } from "@/server/auth/adminSession";
import { listPaymentRequests } from "@/server/services/payment.service";
import { EmptyState, PageHeading } from "@/components/ui/Primitives";
import { inputClasses } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { PaymentRow, type PaymentRowData } from "./PaymentRow";

export const metadata = { title: "Payments - BuyEl admin" };

const STATUSES = ["all", "pending", "accepted", "rejected"] as const;

const WHAT: Record<string, string> = {
  wallet: "Credits",
  listing_unlock: "Chat unlock",
  listing_boost: "Boost",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; in?: string; status?: string; page?: string }>;
}) {
  const admin = await requireAdmin();
  if (!canView(admin, "payments")) notFound();
  const editable = canEdit(admin, "payments");

  const params = await searchParams;
  const search = params.q ?? "";
  const searchIn = params.in === "txn" ? "txn" : "phone";
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? params.status
    : "all";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const { rows, total, pageSize, pendingCount } = await listPaymentRequests({
    search,
    searchIn,
    status: status === "all" ? undefined : (status as "pending" | "accepted" | "rejected"),
    page,
  });

  const payments: PaymentRowData[] = rows.map((row) => ({
    id: row.id,
    userName: `${row.user.name}${row.user.lastName ? ` ${row.user.lastName}` : ""}`,
    userPhone: row.user.phone,
    planLabel: row.plan?.label ?? "Plan removed",
    what: `${WHAT[row.targetType] ?? row.targetType}${
      row.targetListing ? ` . ${row.targetListing.courseText}` : ""
    }`,
    amount: row.amount,
    txnId: row.txnId,
    platform: row.platform?.name ?? "Unknown app",
    status: row.status as PaymentRowData["status"],
    createdLabel: row.createdAt.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    rejectReason: row.rejectReason,
  }));

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title="Payments"
        description={
          pendingCount > 0
            ? `${pendingCount} ${pendingCount === 1 ? "payment is" : "payments are"} waiting for review.`
            : "Every submitted transaction, in one place."
        }
      />

      <form method="get" action="/admin/payments" className="flex flex-wrap gap-2">
        <select name="in" defaultValue={searchIn} className={cn(inputClasses, "w-40")} aria-label="Search in">
          <option value="phone">Phone number</option>
          <option value="txn">Transaction ID</option>
        </select>

        <input
          name="q"
          defaultValue={search}
          placeholder="Search"
          className={cn(inputClasses, "min-w-48 flex-1")}
          aria-label="Search"
        />

        <select
          name="status"
          defaultValue={status}
          className={cn(inputClasses, "w-36")}
          aria-label="Status"
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value === "all" ? "All" : value}
            </option>
          ))}
        </select>

        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {payments.length === 0 ? (
        <EmptyState
          title="No payments here"
          description="Payments appear as soon as a student submits a transaction ID."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <ul className="divide-y divide-line">
            {payments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} editable={editable} />
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span>
          {total} {total === 1 ? "payment" : "payments"}
        </span>
        {pages > 1 ? (
          <span className="flex gap-3">
            {page > 1 ? (
              <Link
                className="text-brand hover:underline"
                href={`/admin/payments?q=${encodeURIComponent(search)}&in=${searchIn}&status=${status}&page=${page - 1}`}
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
                href={`/admin/payments?q=${encodeURIComponent(search)}&in=${searchIn}&status=${status}&page=${page + 1}`}
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
