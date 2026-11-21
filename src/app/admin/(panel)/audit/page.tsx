import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { canView, requireAdmin } from "@/server/auth/adminSession";
import { EmptyState, PageHeading } from "@/components/ui/Primitives";

export const metadata = { title: "Activity log - BuyEl admin" };

const PAGE_SIZE = 50;

/** Human wording for the actions services write. */
const ACTIONS: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  activate: "switched on",
  deactivate: "switched off",
  update_owner: "updated the owner account",
  adjust_credits: "adjusted credits for",
  block_user: "blocked",
  unblock_user: "unblocked",
  payment_accepted: "accepted payment",
  payment_rejected: "rejected payment",
  master_request_added: "added to the master list",
  master_request_ignored: "ignored a request for",
  master_request_user_entry_modified: "corrected a student entry for",
  listing_close: "closed listing",
  listing_reopen: "reopened listing",
  listing_delete: "removed listing",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await requireAdmin();
  // The activity log sits with user access, since it is about who did what.
  if (!canView(admin, "user_access")) notFound();

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const [rows, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { adminUser: { select: { name: true, username: true } } },
    }),
    prisma.adminAuditLog.count(),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title="Activity log"
        description="Every change made from this panel, newest first."
      />

      {rows.length === 0 ? (
        <EmptyState title="Nothing logged yet" description="Admin actions appear here." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-3">
                <span className="text-sm font-medium">
                  {row.adminUser?.name ?? "Removed account"}
                </span>
                <span className="text-sm text-ink-soft">
                  {ACTIONS[row.action] ?? row.action.replace(/_/g, " ")}
                </span>
                <span className="text-sm text-ink-soft">{row.entity.replace(/_/g, " ")}</span>
                <span className="ml-auto text-xs text-ink-muted">
                  {row.createdAt.toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span>
          {total} {total === 1 ? "entry" : "entries"}
        </span>
        {pages > 1 ? (
          <span className="flex gap-3">
            {page > 1 ? (
              <Link className="text-brand hover:underline" href={`/admin/audit?page=${page - 1}`}>
                Previous
              </Link>
            ) : null}
            <span>
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Link className="text-brand hover:underline" href={`/admin/audit?page=${page + 1}`}>
                Next
              </Link>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}
