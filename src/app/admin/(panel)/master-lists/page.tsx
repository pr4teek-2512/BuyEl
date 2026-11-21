import Link from "next/link";
import { notFound } from "next/navigation";
import { canEdit, canView, requireAdmin } from "@/server/auth/adminSession";
import {
  listBranches,
  listColleges,
  listCourses,
  listPendingRequests,
} from "@/server/services/masterlistAdmin.service";
import { PageHeading } from "@/components/ui/Primitives";
import { cn } from "@/lib/cn";
import { EntryTable } from "./EntryTable";
import { RequestQueue } from "./RequestQueue";
import { SearchBox } from "./SearchBox";

export const metadata = { title: "Master lists - BuyEl admin" };

type Tab = "colleges" | "branches" | "courses" | "requests";

const TABS: { key: Tab; label: string }[] = [
  { key: "colleges", label: "Colleges" },
  { key: "branches", label: "Branches" },
  { key: "courses", label: "Courses" },
  { key: "requests", label: "Pending requests" },
];

export default async function MasterListsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; page?: string }>;
}) {
  const admin = await requireAdmin();
  if (!canView(admin, "master_lists")) notFound();

  const params = await searchParams;
  const tab = (TABS.find((t) => t.key === params.tab)?.key ?? "colleges") as Tab;
  const search = params.q ?? "";
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const editable = canEdit(admin, "master_lists");

  const rawRequests = await listPendingRequests();
  const requests = rawRequests.map((request) => ({
    id: request.id,
    listType: request.listType,
    submittedText: request.submittedText,
    createdAt: request.createdAt.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    submittedBy: request.submittedBy
      ? {
          name: request.submittedBy.name,
          lastName: request.submittedBy.lastName,
          phone: request.submittedBy.phone,
        }
      : null,
  }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title="Colleges, branches and courses"
        description="Branches ship pre loaded. Colleges and courses grow from what students type, and land here for review."
      />

      <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((item) => {
          const active = item.key === tab;
          const count = item.key === "requests" ? requests.length : undefined;
          return (
            <Link
              key={item.key}
              href={`/admin/master-lists?tab=${item.key}`}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm transition-colors",
                active
                  ? "border-brand font-medium text-brand"
                  : "border-transparent text-ink-soft hover:text-ink",
              )}
            >
              {item.label}
              {count ? (
                <span className="ml-1.5 rounded-full bg-danger px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {tab === "requests" ? (
        <RequestQueue requests={requests} editable={editable} />
      ) : (
        <>
          <SearchBox tab={tab} defaultValue={search} />
          {tab === "colleges" ? (
            <CollegesTab search={search} page={page} editable={editable} />
          ) : tab === "branches" ? (
            <BranchesTab search={search} page={page} editable={editable} />
          ) : (
            <CoursesTab search={search} page={page} editable={editable} />
          )}
        </>
      )}
    </div>
  );
}

async function CollegesTab({
  search,
  page,
  editable,
}: {
  search: string;
  page: number;
  editable: boolean;
}) {
  const { rows, total, pageSize } = await listColleges({ search, page });

  return (
    <EntryTable
      list="college"
      editable={editable}
      total={total}
      page={page}
      pageSize={pageSize}
      search={search}
      rows={rows.map((row) => ({
        id: row.id,
        name: row.name,
        abbreviation: row.abbreviation,
      }))}
      emptyMessage="No colleges yet. They appear here as students type them, or you can add one."
    />
  );
}

async function BranchesTab({
  search,
  page,
  editable,
}: {
  search: string;
  page: number;
  editable: boolean;
}) {
  const { rows, total, pageSize } = await listBranches({ search, page });

  return (
    <EntryTable
      list="branch"
      editable={editable}
      total={total}
      page={page}
      pageSize={pageSize}
      search={search}
      rows={rows.map((row) => ({ id: row.id, name: row.name, level: row.level }))}
      emptyMessage="No branches match that search."
    />
  );
}

async function CoursesTab({
  search,
  page,
  editable,
}: {
  search: string;
  page: number;
  editable: boolean;
}) {
  const { rows, total, pageSize } = await listCourses({ search, page });

  return (
    <EntryTable
      list="course"
      editable={editable}
      total={total}
      page={page}
      pageSize={pageSize}
      search={search}
      rows={rows.map((row) => ({ id: row.id, name: row.name }))}
      emptyMessage="No courses yet. They appear here as students list the courses they are selling."
    />
  );
}
