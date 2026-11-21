import { Coins } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import {
  listActivePlatforms,
  listPayablePlans,
  listUserPayments,
  pendingRequestFor,
} from "@/server/services/payment.service";
import { describePlan } from "@/server/services/payment.rules";
import { Badge, Card, EmptyState, PageHeading } from "@/components/ui/Primitives";
import { PayAction } from "@/components/payment/PayAction";
import { formatRupees } from "@/lib/text";

export const metadata = { title: "Credits - BuyEl" };

export default async function PaymentsPage() {
  const user = await requireUser();

  const [plans, platforms, history, pending] = await Promise.all([
    listPayablePlans("credits"),
    listActivePlatforms(),
    listUserPayments(user.id),
    pendingRequestFor(user.id, "wallet"),
  ]);

  const planOptions = plans.map((plan) => ({
    id: plan.id,
    label: plan.label,
    description: describePlan({
      category: "credits",
      label: plan.label,
      price: plan.price,
      creditsGranted: plan.creditsGranted,
      boostDays: plan.boostDays,
    }),
    price: plan.price,
    qrImageUrl: plan.qrImageUrl,
    qrUpiId: plan.qrUpiId,
  }));

  const platformOptions = platforms.map((platform) => ({
    id: platform.id,
    name: platform.name,
    logoUrl: platform.logoUrl,
    utrTerm: platform.utrTerm,
    appTxnTerm: platform.appTxnTerm,
    explanatoryImageUrl: platform.explanatoryImageUrl,
  }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title="Credits"
        description="One credit opens one conversation about one listing. Replying in a conversation you already opened is free."
      />

      <Card className="flex items-center gap-4">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Coins className="size-6" />
        </span>
        <div className="flex-1">
          <p className="text-sm text-ink-muted">Your balance</p>
          <p className="text-2xl font-semibold">{user.creditBalance}</p>
        </div>
        <PayAction
          label="Buy credits"
          title="Buy credits"
          plans={planOptions}
          platforms={platformOptions}
          size="md"
          pending={Boolean(pending)}
        />
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Your payment requests</h2>

        {history.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Once you pay through a QR code and submit the transaction ID, it shows up here while our team checks it."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((payment) => (
              <Card as="li" key={payment.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {payment.plan?.label ?? "Payment"}{" "}
                    <span className="font-normal text-ink-muted">
                      {formatRupees(payment.amount)}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {payment.txnId} .{" "}
                    {payment.createdAt.toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {payment.status === "rejected" && payment.rejectReason ? (
                    <p className="mt-1 text-xs text-danger">{payment.rejectReason}</p>
                  ) : null}
                </div>

                <Badge
                  tone={
                    payment.status === "accepted"
                      ? "success"
                      : payment.status === "rejected"
                        ? "danger"
                        : "warning"
                  }
                >
                  {payment.status === "pending" ? "Under review" : payment.status}
                </Badge>
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
