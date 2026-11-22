"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * Shown right after a listing is confirmed. A listing only sells once buyers
 * know it exists, so the seller is offered the link to their own course on
 * BuyEl before they move on.
 */
export function ShareListingDialog({
  course,
  college,
  onClose,
}: {
  course: string;
  college: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const query = new URLSearchParams({ college, course });
  const path = `/?${query.toString()}#results`;
  const link = typeof window === "undefined" ? path : `${window.location.origin}${path}`;

  /**
   * The clipboard API needs a focused document and a permission the browser
   * can refuse, so a refusal falls back to the old selection based copy
   * rather than leaving the seller with a button that does nothing.
   */
  async function copyLink(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch {
      // Falls through to the selection copy below.
    }

    try {
      const area = document.createElement("textarea");
      area.value = link;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "0";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(area);
      return copied;
    } catch {
      return false;
    }
  }

  async function share() {
    setFailed(false);

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "BuyEl",
          text: `${course} at ${college} is up for grabs on BuyEl.`,
          url: link,
        });
        onClose();
        return;
      } catch (error) {
        // Dismissing the share sheet throws too, and that is not a failure.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    const copied = await copyLink();
    setCopied(copied);
    setFailed(!copied);
  }

  return (
    <Modal
      title="Listing created"
      description="Share the link so more buyers see it. The more people open it, the faster it goes."
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-surface-soft px-3 py-2.5">
          <p className="text-xs font-medium text-ink-muted">Link to your listing</p>
          <p className="mt-0.5 break-all text-sm text-ink">{link}</p>
        </div>

        {copied ? (
          <p className="flex items-center gap-1.5 text-sm text-success">
            <Check className="size-4" />
            Link copied. Paste it in your class group.
          </p>
        ) : null}
        {failed ? (
          <p role="alert" className="text-sm text-danger">
            Could not open sharing. Copy the link above instead.
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="button" size="lg" className="flex-1" onClick={share}>
            {copied ? <Copy className="size-4" /> : <Share2 className="size-4" />}
            Share
          </Button>
          <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
