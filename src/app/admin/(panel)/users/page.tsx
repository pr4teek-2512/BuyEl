import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { canEdit, canView, requireAdmin } from "@/server/auth/adminSession";
import { EmptyState, PageHeading } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { initials } from "@/lib/text";
import { cn } from "@/lib/cn";
import { UserRow, type UserRowData } from "./UserRow";

export const metadata = { title: "Users - BuyEl admin" };

const PAGE_SIZE = 25;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; show?: string; page?: string }>;
}) {
  const admin = await requireAdmin();
  if (!canView(admin, "users")) notFound();
  const editable = canEdit(admin, "users");

  const params = await searchParams;
  const search = (params.q ?? "").trim();
  const show = params.show === "all" ? "all" : params.show === "blocked" ? "blocked" : "students";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where = {
    ...(show === "students" ? { isTestAccount: false } : {}),
    ...(show === "blocked" ? { status: "blocked" as const } : {}),
    ...(search
      ? {
          OR: [
            { phone: { contains: search } },
            { name: { contains: search, mode: "insensitive" as const } },
            { collegeText: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { listings: true, buyerThreads: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const users: UserRowData[] = rows.map((row) => ({
    id: row.id,
    initials: initials(row.name, row.lastName),
    name: `${row.name}${row.lastName ? ` ${row.lastName}` : ""}`,
    phone: row.phone,
    college: row.collegeText,
    branch: row.branchText,
    graduationYear: row.graduationYear,
    creditBalance: row.creditBalance,
    blocked: row.status === "blocked",
    isTestAccount: row.isTestAccount,
    listings: row._count.listings,
    chatsStarted: row._count.buyerThreads,
    joinedLabel: row.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  }));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title="Students"
        description="Everyone who has registered. Credit changes you make here are written to the ledger."
      />

      <form method="get" action="/admin/users" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder="Search by phone, name or college"
          className={cn(inputClasses, "min-w-56 flex-1")}
          aria-label="Search students"
        />
        <select name="show" defaultValue={show} className={cn(inputClasses, "w-44")} aria-label="Show">
          <option value="students">Real students</option>
          <option value="all">Including test accounts</option>
          <option value="blocked">Blocked only</option>
        </select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {users.length === 0 ? (
        <EmptyState title="Nobody here" description="No students match that search." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <ul className="divide-y divide-line">
            {users.map((user) => (
              <UserRow key={user.id} user={user} editable={editable} />
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span>
          {total} {total === 1 ? "student" : "students"}
        </span>
        {pages > 1 ? (
          <span className="flex gap-3">
            {page > 1 ? (
              <Link
                className="text-brand hover:underline"
                href={`/admin/users?q=${encodeURIComponent(search)}&show=${show}&page=${page - 1}`}
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
                href={`/admin/users?q=${encodeURIComponent(search)}&show=${show}&page=${page + 1}`}
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
