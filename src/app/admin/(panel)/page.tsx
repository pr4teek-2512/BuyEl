import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { canView, requireAdmin } from "@/server/auth/adminSession";
import { Card, PageHeading } from "@/components/ui/Primitives";

export const metadata = { title: "Dashboard - BuyEl admin" };

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  // An employee without dashboard access lands on the first page they do have.
  if (!canView(admin, "dashboard")) {
    redirect(canView(admin, "master_lists") ? "/admin/master-lists" : "/admin/login");
  }

  const [users, colleges, branches, courses, pending, listings] = await Promise.all([
    prisma.user.count({ where: { isTestAccount: false } }),
    prisma.college.count(),
    prisma.branch.count(),
    prisma.course.count(),
    prisma.masterListRequest.count({ where: { status: "pending" } }),
    prisma.listing.count({ where: { status: "active" } }),
  ]);

  const tiles = [
    { label: "Students", value: users },
    { label: "Active listings", value: listings },
    { label: "Colleges", value: colleges },
    { label: "Branches", value: branches },
    { label: "Courses", value: courses },
    { label: "Pending requests", value: pending, highlight: pending > 0 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title={`Welcome, ${admin.name}`}
        description="Test accounts are excluded from the student count."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <p className="text-sm text-ink-muted">{tile.label}</p>
            <p
              className={`mt-1 text-2xl font-semibold ${tile.highlight ? "text-danger" : "text-ink"}`}
            >
              {tile.value}
            </p>
          </Card>
        ))}
      </div>

      {pending > 0 && canView(admin, "master_lists") ? (
        <Card className="flex items-center justify-between gap-4 border-brand/30 bg-brand-soft/40">
          <p className="text-sm">
            {pending} new {pending === 1 ? "entry is" : "entries are"} waiting for review.
          </p>
          <Link
            href="/admin/master-lists?tab=requests"
            className="shrink-0 text-sm font-medium text-brand hover:underline"
          >
            Review now
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
