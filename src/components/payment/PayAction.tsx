"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  PaymentDialog,
  type PaymentPlanOption,
  type PaymentPlatformOption,
} from "./PaymentDialog";

/**
 * Any button that leads to a payment. Opens the two step QR popup.
 * When a request for the same thing is already waiting, it says so instead,
 * so a student cannot pay twice while the first one is being reviewed.
 */
export function PayAction({
  label,
  title,
  plans,
  platforms,
  listingId,
  icon,
  variant = "primary",
  size = "sm",
  fullWidth,
  pending,
}: {
  label: string;
  title: string;
  plans: PaymentPlanOption[];
  platforms: PaymentPlatformOption[];
  listingId?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (pending) {
    return (
      <Button variant="secondary" size={size} fullWidth={fullWidth} disabled>
        Awaiting approval
      </Button>
    );
  }

  const unavailable = plans.length === 0 || platforms.length === 0;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        onClick={() => setOpen(true)}
        disabled={unavailable}
        title={unavailable ? "No plans are set up for this yet." : undefined}
      >
        {icon}
        {label}
      </Button>

      {open ? (
        <PaymentDialog
          title={title}
          plans={plans}
          platforms={platforms}
          listingId={listingId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
