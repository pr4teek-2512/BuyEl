"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Primitives";
import { cn } from "@/lib/cn";
import { deleteEntryAction, saveEntryAction } from "./actions";
import { initialFormState, type FormState } from "./state";

export type EntryRow = {
  id: string;
  name: string;
  abbreviation?: string;
  level?: "UG" | "PG";
};

export function EntryTable({
  list,
  rows,
  editable,
  total,
  page,
  pageSize,
  search,
  emptyMessage,
}: {
  list: "college" | "branch" | "course";
  rows: EntryRow[];
  editable: boolean;
  total: number;
  page: number;
  pageSize: number;
  search: string;
  emptyMessage: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      {editable ? <AddRow list={list} /> : null}

      {rows.length === 0 ? (
        <EmptyState title="Nothing here yet" description={emptyMessage} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <EntryRowForm key={row.id} list={list} row={row} editable={editable} />
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span>
          {total} {total === 1 ? "entry" : "entries"}
        </span>
        {pages > 1 ? (
          <span className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                className="text-brand hover:underline"
                href={`/admin/master-lists?tab=${list}s&q=${encodeURIComponent(search)}&page=${page - 1}`}
              >
                Previous
              </Link>
            ) : null}
            <span>
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Link
                className="text-brand hover:underline"
                href={`/admin/master-lists?tab=${list}s&q=${encodeURIComponent(search)}&page=${page + 1}`}
              >
                Next
              </Link>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Feedback({ state }: { state: FormState }) {
  if (state.error) {
    return <p className="text-xs text-danger">{state.error}</p>;
  }
  if (state.success) {
    return <p className="text-xs text-success">{state.success}</p>;
  }
  return null;
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      {label}
    </Button>
  );
}

function AddRow({ list }: { list: "college" | "branch" | "course" }) {
  const [state, submit] = useActionState(saveEntryAction, initialFormState);

  return (
    <form
      action={submit}
      className="flex flex-col gap-2 rounded-2xl border border-dashed border-line-strong bg-white p-3 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="list" value={list} />
      <input
        name="name"
        required
        placeholder={
          list === "college"
            ? "Add a college, for example Delhi Technological University"
            : list === "branch"
              ? "Add a branch, for example Civil Engineering"
              : "Add a course, for example Data Structures CS201"
        }
        className={cn(inputClasses, "flex-1")}
        aria-label="New entry name"
      />

      {list === "college" ? (
        <input
          name="abbreviation"
          placeholder="Short form (DTU)"
          className={cn(inputClasses, "sm:w-44")}
          aria-label="Short form"
        />
      ) : null}

      {list === "branch" ? (
        <select name="level" className={cn(inputClasses, "sm:w-28")} aria-label="Level">
          <option value="UG">UG</option>
          <option value="PG">PG</option>
        </select>
      ) : null}

      <SaveButton label="Add" />
      <Feedback state={state} />
    </form>
  );
}

function EntryRowForm({
  list,
  row,
  editable,
}: {
  list: "college" | "branch" | "course";
  row: EntryRow;
  editable: boolean;
}) {
  const [saveState, save] = useActionState(saveEntryAction, initialFormState);
  const [deleteState, remove] = useActionState(deleteEntryAction, initialFormState);

  if (!editable) {
    return (
      <li className="flex items-center gap-3 px-4 py-3 text-sm">
        <span className="flex-1">{row.name}</span>
        {row.abbreviation ? <span className="text-ink-muted">{row.abbreviation}</span> : null}
        {row.level ? <span className="text-ink-muted">{row.level}</span> : null}
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
      <form action={save} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <input type="hidden" name="list" value={list} />
        <input type="hidden" name="id" value={row.id} />

        <input
          name="name"
          defaultValue={row.name}
          className={cn(inputClasses, "flex-1")}
          aria-label="Name"
        />

        {list === "college" ? (
          <input
            name="abbreviation"
            defaultValue={row.abbreviation}
            className={cn(inputClasses, "sm:w-40")}
            aria-label="Short form"
          />
        ) : null}

        {list === "branch" ? (
          <select
            name="level"
            defaultValue={row.level}
            className={cn(inputClasses, "sm:w-24")}
            aria-label="Level"
          >
            <option value="UG">UG</option>
            <option value="PG">PG</option>
          </select>
        ) : null}

        <SaveButton label="Save" />
      </form>

      <form action={remove}>
        <input type="hidden" name="list" value={list} />
        <input type="hidden" name="id" value={row.id} />
        <Button type="submit" variant="danger" size="sm" aria-label={`Delete ${row.name}`}>
          <Trash2 className="size-4" />
        </Button>
      </form>

      <Feedback state={saveState.error || saveState.success ? saveState : deleteState} />
    </li>
  );
}
