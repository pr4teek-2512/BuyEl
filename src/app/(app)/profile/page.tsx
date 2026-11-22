import Link from "next/link";
import type { ReactNode } from "react";
import { requireUserForPage } from "@/server/auth/session";
import { initials, phoneWithoutCountryCode } from "@/lib/text";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Card, PageHeading } from "@/components/ui/Primitives";
import { SignOutButton } from "./SignOutButton";

export const metadata = { title: "Profile - BuyEl" };

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await requireUserForPage();

  const fullName = [user.name, user.lastName].filter(Boolean).join(" ");
  const memberSince = user.createdAt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <PageHeading title="Profile" description="The details you gave when you created this account." />

      <Card className="flex items-center gap-4">
        <Avatar initials={initials(user.name, user.lastName)} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">{fullName}</p>
          <p className="text-sm text-ink-muted">+91 {phoneWithoutCountryCode(user.phone)}</p>
        </div>
        {user.isTestAccount ? <Badge tone="warning" className="ml-auto">Test account</Badge> : null}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-ink">Account details</h2>
        <dl className="mt-1">
          <Detail label="First name" value={user.name} />
          <Detail label="Last name" value={user.lastName || "Not given"} />
          <Detail label="Phone number" value={`+91 ${phoneWithoutCountryCode(user.phone)}`} />
          <Detail label="University or college" value={user.collegeText} />
          <Detail label="Branch" value={user.branchText} />
          <Detail label="Graduation year" value={user.graduationYear} />
          <Detail
            label="Credits"
            value={
              <Link href="/payments" className="font-semibold text-brand hover:underline">
                {user.creditBalance} credits
              </Link>
            }
          />
          <Detail label="Member since" value={memberSince} />
        </dl>
      </Card>

      <Card className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Sign out</h2>
          <p className="mt-1 text-sm text-ink-muted">
            You will need your phone number and a fresh code to sign back in.
          </p>
        </div>
        <SignOutButton />
      </Card>
    </div>
  );
}
