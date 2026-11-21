import { notFound } from "next/navigation";
import { ADMIN_PAGES, canEdit, canView, requireAdmin } from "@/server/auth/adminSession";
import {
  listAdminUsers,
  listTestAccounts,
} from "@/server/services/adminAccounts.service";
import { PageHeading } from "@/components/ui/Primitives";
import { env } from "@/lib/env";
import { maskPhone } from "@/lib/text";
import { AdminAccounts, type AdminAccountRow } from "./AdminAccounts";
import { TestAccounts, type TestAccountRow } from "./TestAccounts";

export const metadata = { title: "User access - BuyEl admin" };

export default async function UserAccessPage() {
  const admin = await requireAdmin();
  if (!canView(admin, "user_access")) notFound();
  const editable = canEdit(admin, "user_access");

  const [accounts, testAccounts] = await Promise.all([listAdminUsers(), listTestAccounts()]);

  const accountRows: AdminAccountRow[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    username: account.username,
    role: account.role as "owner" | "employee",
    permissions: account.permissions.map((permission) => ({
      pageKey: permission.pageKey,
      canView: permission.canView,
      canEdit: permission.canEdit,
    })),
  }));

  const testRows: TestAccountRow[] = testAccounts.map((account) => ({
    id: account.id,
    name: account.name,
    phone: account.phone,
    fixedOtp: account.fixedOtp,
    canAccessPaidServices: account.canAccessPaidServices,
    testModeOn: account.testModeOn,
    redoOnboarding: account.redoOnboarding,
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="User access"
        description="Who can get into this panel, and the test accounts your team signs in with."
      />

      <AdminAccounts
        accounts={accountRows}
        pages={ADMIN_PAGES.map((page) => ({ key: page.key, label: page.label }))}
        editable={editable}
        ownerOtpHint={maskPhone(env.adminOwner.otpPhone)}
      />

      <TestAccounts accounts={testRows} editable={editable} />
    </div>
  );
}
