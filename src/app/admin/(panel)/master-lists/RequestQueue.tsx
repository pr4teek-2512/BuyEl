"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { Badge, Card, EmptyState } from "@/components/ui/Primitives";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/text";
import { resolveRequestAction } from "./actions";
import { initialFormState } from "./state";

export type PendingRequest = {
  id: string;
  listType: "college" | "branch" | "course";
  submittedText: string;
  createdAt: string;
  submittedBy: { name: string; lastName: string | null; phone: string } | null;
};

const LABELS: Record<PendingRequest["listType"], string> = {
  college: "College",
  branch: "Branch",
  course: "Course",
};

export function RequestQueue({
  requests,
  editable,
}: {
  requests: PendingRequest[];
  editable: boolean;
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title="Nothing waiting for review"
        description="When a student types a college, branch or course that is not in the master list, it appears here. They can keep using it straight away."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} editable={editable} />
      ))}
    </div>
  );
}

function ActionButton({
  intent,
  variant,
  children,
}: {
  intent: string;
  variant: "primary" | "secondary" | "ghost";
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" name="intent" value={intent} size="sm" variant={variant} loading={pending}>
      {children}
    </Button>
  );
}

function RequestCard({
  request,
  editable,
}: {
  request: PendingRequest;
  editable: boolean;
}) {
  const [state, submit] = useActionState(resolveRequestAction, initialFormState);
  const [text, setText] = useState(request.submittedText);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{LABELS[request.listType]}</Badge>
        <p className="font-medium">{request.submittedText}</p>
        <span className="ml-auto text-xs text-ink-muted">{request.createdAt}</span>
      </div>

      {request.submittedBy ? (
        <p className="text-xs text-ink-muted">
          Submitted by {initials(request.submittedBy.name, request.submittedBy.lastName)} (
          {request.submittedBy.phone})
        </p>
      ) : (
        <p className="text-xs text-ink-muted">Submitted before the account was created.</p>
      )}

      {editable ? (
        <form action={submit} className="flex flex-col gap-3 border-t border-line pt-3">
          <input type="hidden" name="requestId" value={request.id} />

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              name="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              className={cn(inputClasses, "flex-1")}
              aria-label="Corrected text"
            />

            {request.listType === "college" ? (
              <input
                name="abbreviation"
                placeholder="Short form (DTU)"
                className={cn(inputClasses, "sm:w-44")}
                aria-label="Short form"
              />
            ) : null}

            {request.listType === "branch" ? (
              <select name="level" className={cn(inputClasses, "sm:w-28")} aria-label="Level">
                <option value="UG">UG</option>
                <option value="PG">PG</option>
              </select>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton intent="add" variant="primary">
              Add to master list
            </ActionButton>
            <ActionButton intent="modify" variant="secondary">
              Fix this student&apos;s entry only
            </ActionButton>
            <ActionButton intent="ignore" variant="ghost">
              Ignore
            </ActionButton>
          </div>

          <p className="text-xs text-ink-muted">
            Adding also links every student and listing that typed the same text. Fixing only
            changes what this student sees. Ignoring leaves everything as it is.
          </p>

          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
        </form>
      ) : (
        <p className="border-t border-line pt-3 text-xs text-ink-muted">
          You have view only access to this page.
        </p>
      )}
    </Card>
  );
}
