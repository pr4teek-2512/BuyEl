"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Primitives";
import { adjustCreditsAction, toggleBlockAction } from "./actions";
import { initialFormState } from "../master-lists/state";

export type UserRowData = {
  id: string;
  initials: string;
  name: string;
  phone: string;
  college: string;
  branch: string;
  graduationYear: number;
  creditBalance: number;
  blocked: boolean;
  isTestAccount: boolean;
  listings: number;
  chatsStarted: number;
  joinedLabel: string;
};

function Pending({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} loading={pending}>
      {children}
    </Button>
  );
}

export function UserRow({ user, editable }: { user: UserRowData; editable: boolean }) {
  const [open, setOpen] = useState(false);
  const [creditState, adjust] = useActionState(adjustCreditsAction, initialFormState);
  const [blockState, toggleBlock] = useActionState(toggleBlockAction, initialFormState);
  const feedback = creditState.error || creditState.success ? creditState : blockState;

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar initials={user.initials} size="sm" />

        <div className="min-w-[11rem] flex-1">
          <p className="text-sm font-medium">
            {user.name}
            {user.isTestAccount ? (
              <span className="ml-2 text-xs font-normal text-ink-muted">test account</span>
            ) : null}
          </p>
          <p className="text-xs text-ink-muted">{user.phone}</p>
        </div>

        <div className="min-w-[10rem]">
          <p className="truncate text-sm">{user.college}</p>
          <p className="truncate text-xs text-ink-muted">
            {user.branch} . {user.graduationYear}
          </p>
        </div>

        <div className="text-sm">
          <span className="font-semibold">{user.creditBalance}</span>
          <span className="text-ink-muted"> credits</span>
        </div>

        <div className="text-xs text-ink-muted">
          {user.listings} listings . {user.chatsStarted} chats
        </div>

        {user.blocked ? <Badge tone="danger">Blocked</Badge> : null}

        {editable ? (
          <Button size="sm" variant="ghost" onClick={() => setOpen((value) => !value)}>
            {open ? "Close" : "Manage"}
          </Button>
        ) : null}
      </div>

      {open && editable ? (
        <div className="flex flex-wrap items-end gap-4 border-t border-line pt-3">
          <form action={adjust} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="userId" value={user.id} />
            <label>
              <span className="mb-1 block text-xs font-medium text-ink-soft">
                Adjust credits (use a minus to remove)
              </span>
              <input
                name="amount"
                type="number"
                placeholder="2"
                className={`${inputClasses} w-28`}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-ink-soft">Reason</span>
              <input name="note" placeholder="Support credit" className={`${inputClasses} w-56`} />
            </label>
            <Pending type="submit" size="sm" variant="secondary">
              Apply
            </Pending>
          </form>

          <form action={toggleBlock} className="ml-auto">
            <input type="hidden" name="userId" value={user.id} />
            <Pending type="submit" size="sm" variant={user.blocked ? "secondary" : "danger"}>
              {user.blocked ? "Unblock" : "Block"}
            </Pending>
          </form>
        </div>
      ) : null}

      {feedback.error ? <p className="text-sm text-danger">{feedback.error}</p> : null}
      {feedback.success ? <p className="text-sm text-success">{feedback.success}</p> : null}
    </li>
  );
}
