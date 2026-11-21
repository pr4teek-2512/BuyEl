"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Primitives";
import { reviewPaymentAction } from "./actions";
import { initialFormState } from "../master-lists/state";

export type PaymentRowData = {
  id: string;
  userName: string;
  userPhone: string;
  planLabel: string;
  what: string;
  amount: number;
  txnId: string;
  platform: string;
  status: "pending" | "accepted" | "rejected";
  createdLabel: string;
  rejectReason: string | null;
};

function Pending({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} loading={pending}>
      {children}
    </Button>
  );
}

export function PaymentRow({ payment, editable }: { payment: PaymentRowData; editable: boolean }) {
  const [state, review] = useActionState(reviewPaymentAction, initialFormState);
  const [rejecting, setRejecting] = useState(false);

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
        <div className="min-w-[10rem]">
          <p className="text-sm font-medium">{payment.userName}</p>
          <p className="text-xs text-ink-muted">{payment.userPhone}</p>
        </div>

        <div className="min-w-[9rem]">
          <p className="text-sm">{payment.planLabel}</p>
          <p className="text-xs text-ink-muted">{payment.what}</p>
        </div>

        <div>
          <p className="text-sm font-semibold">Rs. {payment.amount}</p>
          <p className="text-xs text-ink-muted">{payment.platform}</p>
        </div>

        <div className="min-w-[8rem]">
          <p className="font-mono text-sm">{payment.txnId}</p>
          <p className="text-xs text-ink-muted">{payment.createdLabel}</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Badge
            tone={
              payment.status === "accepted"
                ? "success"
                : payment.status === "rejected"
                  ? "danger"
                  : "warning"
            }
          >
            {payment.status === "pending" ? "Pending" : payment.status}
          </Badge>
        </div>
      </div>

      {payment.rejectReason ? (
        <p className="text-xs text-danger">Reason given: {payment.rejectReason}</p>
      ) : null}

      {editable && payment.status === "pending" ? (
        rejecting ? (
          <form action={review} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="requestId" value={payment.id} />
            <input type="hidden" name="intent" value="reject" />
            <input
              name="reason"
              placeholder="Why is this being rejected?"
              className={`${inputClasses} max-w-sm flex-1`}
              aria-label="Rejection reason"
            />
            <Pending type="submit" size="sm" variant="danger">
              Confirm reject
            </Pending>
            <Button type="button" size="sm" variant="ghost" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            <form action={review}>
              <input type="hidden" name="requestId" value={payment.id} />
              <input type="hidden" name="intent" value="accept" />
              <Pending type="submit" size="sm" variant="success">
                Accept and unlock
              </Pending>
            </form>
            <Button type="button" size="sm" variant="secondary" onClick={() => setRejecting(true)}>
              Reject
            </Button>
          </div>
        )
      ) : null}

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
    </li>
  );
}
