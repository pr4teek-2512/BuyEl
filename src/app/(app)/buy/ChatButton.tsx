"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { openChatAction } from "./actions";
import { initialChatButtonState } from "./state";

function Submit({ alreadyOpen }: { alreadyOpen: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="secondary" loading={pending}>
      <MessageSquare className="size-4" />
      {alreadyOpen ? "Open" : "Chat"}
    </Button>
  );
}

export function ChatButton({
  listingId,
  alreadyOpen,
}: {
  listingId: string;
  alreadyOpen: boolean;
}) {
  const [state, submit] = useActionState(openChatAction, initialChatButtonState);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={submit}>
        <input type="hidden" name="listingId" value={listingId} />
        <Submit alreadyOpen={alreadyOpen} />
      </form>

      {state.status === "no_credits" ? (
        <p className="max-w-[12rem] text-right text-xs text-danger">
          No credits left.{" "}
          <Link href="/payments" className="font-medium underline">
            Buy credits
          </Link>
        </p>
      ) : state.status === "error" ? (
        <p className="max-w-[12rem] text-right text-xs text-danger">{state.error}</p>
      ) : null}
    </div>
  );
}
