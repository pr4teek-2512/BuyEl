"use client";

import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { Badge, Card } from "@/components/ui/Primitives";
import { cn } from "@/lib/cn";
import { deletePlanAction, savePlanAction, togglePlanAction } from "./actions";
import { initialFormState, type FormState } from "../master-lists/state";

export type PlanRow = {
  id: string;
  category: "credits" | "seller_chat_unlock" | "boost";
  label: string;
  price: number;
  creditsGranted: number | null;
  boostDays: number | null;
  qrImageUrl: string | null;
  qrUpiId: string | null;
  isActive: boolean;
  sortOrder: number;
};

function Pending({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} loading={pending}>
      {children}
    </Button>
  );
}

function Feedback({ state }: { state: FormState }) {
  if (state.error) return <p className="text-xs text-danger">{state.error}</p>;
  if (state.success) return <p className="text-xs text-success">{state.success}</p>;
  return null;
}

const CATEGORY_COPY = {
  credits: {
    title: "Chat unlock packs",
    blurb:
      "What buyers pay to get credits. One credit opens one conversation about one listing.",
    unitLabel: "Chat unlocks in this pack",
    unitName: "creditsGranted",
  },
  seller_chat_unlock: {
    title: "Seller chat unlock",
    blurb: "What a seller pays, once per listing, to read and reply to buyers.",
    unitLabel: null,
    unitName: null,
  },
  boost: {
    title: "Prioritisation plans",
    blurb: "What a seller pays to sit above the normal listings for a number of days.",
    unitLabel: "Days of priority",
    unitName: "boostDays",
  },
} as const;

export function PlanSection({
  category,
  plans,
  editable,
}: {
  category: PlanRow["category"];
  plans: PlanRow[];
  editable: boolean;
}) {
  const copy = CATEGORY_COPY[category];

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">{copy.title}</h2>
        <p className="text-sm text-ink-muted">{copy.blurb}</p>
      </div>

      {plans.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong bg-white px-4 py-5 text-sm text-ink-muted">
          Nothing set up yet. Students will not see this option until you add a plan with a QR code.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} editable={editable} />
          ))}
        </ul>
      )}

      {editable ? <NewPlanForm category={category} /> : null}
    </section>
  );
}

function PlanCard({ plan, editable }: { plan: PlanRow; editable: boolean }) {
  const [saveState, save] = useActionState(savePlanAction, initialFormState);
  const [toggleState, toggle] = useActionState(togglePlanAction, initialFormState);
  const [deleteState, remove] = useActionState(deletePlanAction, initialFormState);
  const copy = CATEGORY_COPY[plan.category];

  const feedback =
    saveState.error || saveState.success
      ? saveState
      : toggleState.error || toggleState.success
        ? toggleState
        : deleteState;

  return (
    <Card as="li" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="font-medium">{plan.label}</p>
        {plan.isActive ? (
          <Badge tone="success">Live</Badge>
        ) : (
          <Badge tone="neutral">Hidden</Badge>
        )}
        {!plan.qrImageUrl ? <Badge tone="warning">No QR yet</Badge> : null}
      </div>

      {editable ? (
        <form action={save} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={plan.id} />
          <input type="hidden" name="category" value={plan.category} />

          <div className="grid gap-3 sm:grid-cols-4">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-ink-soft">Name</span>
              <input name="label" defaultValue={plan.label} className={inputClasses} />
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-ink-soft">Price (rupees)</span>
              <input
                name="price"
                type="number"
                min={1}
                defaultValue={plan.price}
                className={inputClasses}
              />
            </label>

            {copy.unitName ? (
              <label>
                <span className="mb-1 block text-xs font-medium text-ink-soft">
                  {copy.unitLabel}
                </span>
                <input
                  name={copy.unitName}
                  type="number"
                  min={1}
                  defaultValue={
                    plan.category === "credits"
                      ? (plan.creditsGranted ?? undefined)
                      : (plan.boostDays ?? undefined)
                  }
                  className={inputClasses}
                />
              </label>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-ink-soft">
                UPI ID shown under the QR (optional)
              </span>
              <input
                name="qrUpiId"
                defaultValue={plan.qrUpiId ?? ""}
                placeholder="name@bank"
                className={inputClasses}
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-ink-soft">Order</span>
              <input
                name="sortOrder"
                type="number"
                defaultValue={plan.sortOrder}
                className={inputClasses}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {plan.qrImageUrl ? (
              <Image
                src={plan.qrImageUrl}
                alt={`QR code for ${plan.label}`}
                width={64}
                height={64}
                className="rounded-lg border border-line"
              />
            ) : null}

            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-ink-soft">
                {plan.qrImageUrl ? "Replace QR code" : "Upload QR code"}
              </span>
              <input
                name="qr"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:text-brand"
              />
            </label>

            <Pending type="submit" size="sm" className="ml-auto">
              Save
            </Pending>
          </div>
        </form>
      ) : (
        <p className="text-sm text-ink-muted">
          {plan.price} rupees. View only access.
        </p>
      )}

      {editable ? (
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <form action={toggle}>
            <input type="hidden" name="id" value={plan.id} />
            <Pending type="submit" size="sm" variant="secondary">
              {plan.isActive ? "Hide from students" : "Make live"}
            </Pending>
          </form>

          <form action={remove} className="ml-auto">
            <input type="hidden" name="id" value={plan.id} />
            <Pending type="submit" size="sm" variant="danger" aria-label={`Delete ${plan.label}`}>
              <Trash2 className="size-4" />
            </Pending>
          </form>
        </div>
      ) : null}

      <Feedback state={feedback} />
    </Card>
  );
}

function NewPlanForm({ category }: { category: PlanRow["category"] }) {
  const [state, submit] = useActionState(savePlanAction, initialFormState);
  const copy = CATEGORY_COPY[category];

  return (
    <form
      action={submit}
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-line-strong bg-white p-4"
    >
      <input type="hidden" name="category" value={category} />

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Name</span>
          <input
            name="label"
            required
            placeholder={
              category === "credits"
                ? "2 chat unlocks"
                : category === "boost"
                  ? "10 days"
                  : "Unlock chat"
            }
            className={inputClasses}
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium text-ink-soft">Price (rupees)</span>
          <input name="price" type="number" min={1} required placeholder="49" className={inputClasses} />
        </label>

        {copy.unitName ? (
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-soft">{copy.unitLabel}</span>
            <input
              name={copy.unitName}
              type="number"
              min={1}
              required
              placeholder={category === "credits" ? "2" : "10"}
              className={inputClasses}
            />
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-ink-soft">QR code</span>
          <input
            name="qr"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:text-brand"
          />
        </label>

        <label className={cn("text-sm", "flex-1")}>
          <span className="mb-1 block text-xs font-medium text-ink-soft">UPI ID (optional)</span>
          <input name="qrUpiId" placeholder="name@bank" className={inputClasses} />
        </label>

        <Pending type="submit">Add plan</Pending>
      </div>

      <Feedback state={state} />
    </form>
  );
}
