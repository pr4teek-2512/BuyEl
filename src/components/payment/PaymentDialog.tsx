"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Download, Info, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { formatRupees } from "@/lib/text";
import { submitPaymentAction } from "@/app/(app)/payments/actions";
import { initialPaymentState } from "@/app/(app)/payments/state";

export type PaymentPlanOption = {
  id: string;
  label: string;
  description: string;
  price: number;
  qrImageUrl: string | null;
  qrUpiId: string | null;
};

export type PaymentPlatformOption = {
  id: string;
  name: string;
  logoUrl: string | null;
  utrTerm: string;
  appTxnTerm: string | null;
  explanatoryImageUrl: string | null;
};

/**
 * The two step payment popup from the PRD.
 *   Step 1: what you are buying, and which UPI app you will pay with.
 *   Step 2: the QR for that exact price, then the transaction reference,
 *           labelled with the words that app itself uses.
 */
/** Some apps name their field with a trailing dot, so sentences do not double up. */
function term(value: string): string {
  return value.trim().replace(/\.+$/, "");
}

export function PaymentDialog({
  title,
  plans,
  platforms,
  listingId,
  onClose,
}: {
  title: string;
  plans: PaymentPlanOption[];
  platforms: PaymentPlatformOption[];
  listingId?: string;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState<PaymentPlanOption | null>(
    plans.length === 1 ? plans[0] : null,
  );
  const [platform, setPlatform] = useState<PaymentPlatformOption | null>(null);
  const [state, submit] = useActionState(submitPaymentAction, initialPaymentState);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const step2 = plan !== null && platform !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="animate-fade-up max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{state.status === "submitted" ? "Request sent" : title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {state.status === "submitted" ? (
          <Submitted onClose={onClose} />
        ) : !step2 ? (
          <StepOne
            plans={plans}
            platforms={platforms}
            plan={plan}
            onPickPlan={setPlan}
            onPickPlatform={setPlatform}
          />
        ) : (
          <StepTwo
            plan={plan}
            platform={platform}
            listingId={listingId}
            submit={submit}
            error={state.error}
            onBack={() => setPlatform(null)}
          />
        )}
      </div>
    </div>
  );
}

function Submitted({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <CheckCircle2 className="size-10 text-success" />
      <p className="font-medium">Payment submitted for review</p>
      <p className="max-w-xs text-sm text-ink-muted">
        Our team checks the transaction and unlocks this for you. You will get a notification
        either way.
      </p>
      <Button onClick={onClose} fullWidth>
        Done
      </Button>
    </div>
  );
}

function StepOne({
  plans,
  platforms,
  plan,
  onPickPlan,
  onPickPlatform,
}: {
  plans: PaymentPlanOption[];
  platforms: PaymentPlatformOption[];
  plan: PaymentPlanOption | null;
  onPickPlan: (plan: PaymentPlanOption) => void;
  onPickPlatform: (platform: PaymentPlatformOption) => void;
}) {
  if (plans.length === 0) {
    return (
      <p className="rounded-xl bg-warning-soft px-3 py-3 text-sm text-warning">
        No plans are set up for this yet. Please check back shortly.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {plans.length > 1 || !plan ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink-soft">Choose a pack</p>
          {plans.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onPickPlan(option)}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-colors",
                plan?.id === option.id
                  ? "border-brand bg-brand-soft"
                  : "border-line hover:border-line-strong",
              )}
            >
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-ink-muted">{option.description}</span>
              </span>
              <span className="font-semibold">{formatRupees(option.price)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {plan ? (
        <div className="flex flex-col gap-3">
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Price</dt>
              <dd className="font-semibold">{formatRupees(plan.price)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">You get</dt>
              <dd className="font-medium">{plan.description}</dd>
            </div>
          </dl>

          <p className="text-center text-sm font-medium text-ink-soft">
            Select the app you will pay with
          </p>

          <div className="grid grid-cols-2 gap-2">
            {platforms.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onPickPlatform(option)}
                className="flex h-16 items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-medium transition-colors hover:border-brand hover:text-brand"
              >
                {option.logoUrl ? (
                  <Image src={option.logoUrl} alt="" width={22} height={22} className="object-contain" />
                ) : null}
                {option.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PayButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth loading={pending}>
      Submit payment
    </Button>
  );
}

function StepTwo({
  plan,
  platform,
  listingId,
  submit,
  error,
  onBack,
}: {
  plan: PaymentPlanOption;
  platform: PaymentPlatformOption;
  listingId?: string;
  submit: (formData: FormData) => void;
  error?: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <p className="text-sm text-ink-muted">Amount to pay</p>
        <p className="text-2xl font-semibold">{formatRupees(plan.price)}</p>
      </div>

      <section className="rounded-xl border border-line p-3">
        <p className="mb-2 text-sm font-medium">Step 1. Pay through this QR</p>
        {plan.qrImageUrl ? (
          <div className="flex flex-col items-center gap-2">
            <Image
              src={plan.qrImageUrl}
              alt={`UPI QR code for ${formatRupees(plan.price)}`}
              width={200}
              height={200}
              className="rounded-lg border border-line"
            />
            {plan.qrUpiId ? (
              <p className="text-xs text-ink-muted">UPI ID: {plan.qrUpiId}</p>
            ) : null}
            <a
              href={plan.qrImageUrl}
              download
              className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm text-ink-soft hover:border-brand hover:text-brand"
            >
              <Download className="size-4" />
              Download QR
            </a>
          </div>
        ) : (
          <p className="text-sm text-danger">This plan has no QR code yet.</p>
        )}
      </section>

      <form action={submit} className="flex flex-col gap-3">
        <input type="hidden" name="planId" value={plan.id} />
        <input type="hidden" name="platformId" value={platform.id} />
        {listingId ? <input type="hidden" name="listingId" value={listingId} /> : null}

        <section className="rounded-xl border border-line p-3">
          <p className="mb-2 text-sm font-medium">
            Step 2. Paste the {platform.utrTerm} from {platform.name}
          </p>

          {platform.explanatoryImageUrl ? (
            <Image
              src={platform.explanatoryImageUrl}
              alt={`Where to find the ${platform.utrTerm} in ${platform.name}`}
              width={260}
              height={260}
              className="mx-auto mb-3 rounded-lg border border-line object-contain"
            />
          ) : null}

          {platform.appTxnTerm ? (
            <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-danger-soft px-2.5 py-2 text-xs text-danger">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Do not paste the {term(platform.appTxnTerm)}. We need the {term(platform.utrTerm)}.
            </p>
          ) : null}

          <input
            name="txnId"
            required
            placeholder={`Enter the ${platform.utrTerm}`}
            className={inputClasses}
            aria-label={platform.utrTerm}
          />

          <p className="mt-2 text-xs text-ink-muted">
            Access is granted after our team reviews the payment.
          </p>
        </section>

        {error ? (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="lg" onClick={onBack}>
            Back
          </Button>
          <PayButton />
        </div>
      </form>
    </div>
  );
}
