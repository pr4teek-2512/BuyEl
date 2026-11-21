import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { canEdit, canView, requireAdmin } from "@/server/auth/adminSession";
import { PageHeading } from "@/components/ui/Primitives";
import { PlanSection, type PlanRow } from "./PlanEditor";
import { PlatformSection, type PlatformRow } from "./PlatformEditor";

export const metadata = { title: "Plans and QR codes - BuyEl admin" };

export default async function PlansPage() {
  const admin = await requireAdmin();
  if (!canView(admin, "plans")) notFound();
  const editable = canEdit(admin, "plans");

  const [plans, platforms] = await Promise.all([
    prisma.plan.findMany({ orderBy: [{ sortOrder: "asc" }, { price: "asc" }] }),
    prisma.paymentPlatform.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  const rows = plans as unknown as PlanRow[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Plans and QR codes"
        description="Every price point has its own QR code. A plan stays hidden from students until it has one."
      />

      <PlanSection
        category="credits"
        plans={rows.filter((plan) => plan.category === "credits")}
        editable={editable}
      />
      <PlanSection
        category="seller_chat_unlock"
        plans={rows.filter((plan) => plan.category === "seller_chat_unlock")}
        editable={editable}
      />
      <PlanSection
        category="boost"
        plans={rows.filter((plan) => plan.category === "boost")}
        editable={editable}
      />

      <PlatformSection platforms={platforms as unknown as PlatformRow[]} editable={editable} />
    </div>
  );
}
