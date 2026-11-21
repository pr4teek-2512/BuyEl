"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { Badge, Card } from "@/components/ui/Primitives";
import {
  deleteEmployeeAction,
  ownerEditAction,
  saveEmployeeAction,
} from "./actions";
import { initialOwnerEditState } from "./state";
import { initialFormState, type FormState } from "../master-lists/state";

export type AdminPageOption = { key: string; label: string };

export type AdminAccountRow = {
  id: string;
  name: string;
  username: string;
  role: "owner" | "employee";
  permissions: { pageKey: string; canView: boolean; canEdit: boolean }[];
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
  if (state.error) return <p className="text-sm text-danger">{state.error}</p>;
  if (state.success) return <p className="text-sm text-success">{state.success}</p>;
  return null;
}

function PermissionGrid({
  pages,
  permissions,
}: {
  pages: AdminPageOption[];
  permissions: AdminAccountRow["permissions"];
}) {
  const byKey = new Map(permissions.map((permission) => [permission.pageKey, permission]));

  return (
    <fieldset className="rounded-xl border border-line p-3">
      <legend className="px-1 text-xs font-medium text-ink-soft">Pages this account can use</legend>
      <ul className="flex flex-col gap-1.5">
        {pages.map((page) => {
          const current = byKey.get(page.key);
          return (
            <li key={page.key} className="flex items-center gap-4 text-sm">
              <span className="flex-1">{page.label}</span>
              <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                <input type="checkbox" name={`view:${page.key}`} defaultChecked={current?.canView} />
                View
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                <input type="checkbox" name={`edit:${page.key}`} defaultChecked={current?.canEdit} />
                Edit
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

export function AdminAccounts({
  accounts,
  pages,
  editable,
  ownerOtpHint,
}: {
  accounts: AdminAccountRow[];
  pages: AdminPageOption[];
  editable: boolean;
  ownerOtpHint: string;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Admin accounts</h2>
          <p className="text-sm text-ink-muted">
            Employees see only the pages you tick. Edit access always includes view.
          </p>
        </div>
        {editable ? (
          <Button size="sm" onClick={() => setAdding((value) => !value)}>
            {adding ? "Cancel" : "New admin"}
          </Button>
        ) : null}
      </div>

      {adding ? <NewEmployeeForm pages={pages} onDone={() => setAdding(false)} /> : null}

      <ul className="flex flex-col gap-2">
        {accounts.map((account) =>
          account.role === "owner" ? (
            <OwnerCard key={account.id} account={account} ownerOtpHint={ownerOtpHint} editable={editable} />
          ) : (
            <EmployeeCard key={account.id} account={account} pages={pages} editable={editable} />
          ),
        )}
      </ul>
    </section>
  );
}

function NewEmployeeForm({
  pages,
  onDone,
}: {
  pages: AdminPageOption[];
  onDone: () => void;
}) {
  const [state, submit] = useActionState(saveEmployeeAction, initialFormState);

  return (
    <Card className="flex flex-col gap-3">
      <form action={submit} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-soft">Name</span>
            <input name="name" required className={inputClasses} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-soft">Username</span>
            <input name="username" required autoComplete="off" className={inputClasses} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-soft">Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="new-password"
              className={inputClasses}
            />
          </label>
        </div>

        <PermissionGrid pages={pages} permissions={[]} />

        <div className="flex gap-2">
          <Pending type="submit">Create account</Pending>
          <Button type="button" variant="secondary" onClick={onDone}>
            Close
          </Button>
        </div>

        <Feedback state={state} />
      </form>
    </Card>
  );
}

function EmployeeCard({
  account,
  pages,
  editable,
}: {
  account: AdminAccountRow;
  pages: AdminPageOption[];
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saveState, save] = useActionState(saveEmployeeAction, initialFormState);
  const [deleteState, remove] = useActionState(deleteEmployeeAction, initialFormState);
  const granted = account.permissions.filter((permission) => permission.canView || permission.canEdit);

  return (
    <Card as="li" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{account.name}</p>
          <p className="text-xs text-ink-muted">{account.username}</p>
        </div>
        <Badge tone="neutral">Employee</Badge>
        <span className="text-sm text-ink-muted">
          {granted.length} {granted.length === 1 ? "page" : "pages"}
        </span>

        {editable ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOpen((value) => !value)}
              aria-label={`Edit ${account.name}`}
            >
              <Pencil className="size-4" />
            </Button>
            <form action={remove}>
              <input type="hidden" name="id" value={account.id} />
              <Pending
                type="submit"
                size="sm"
                variant="danger"
                aria-label={`Remove ${account.name}`}
              >
                <Trash2 className="size-4" />
              </Pending>
            </form>
          </>
        ) : null}
      </div>

      {open && editable ? (
        <form action={save} className="flex flex-col gap-3 border-t border-line pt-3">
          <input type="hidden" name="id" value={account.id} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-medium text-ink-soft">Name</span>
              <input name="name" defaultValue={account.name} className={inputClasses} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-ink-soft">
                New password (leave blank to keep)
              </span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                className={inputClasses}
              />
            </label>
          </div>

          <PermissionGrid pages={pages} permissions={account.permissions} />

          <Pending type="submit" size="sm">
            Save changes
          </Pending>
        </form>
      ) : null}

      <Feedback state={saveState.error || saveState.success ? saveState : deleteState} />
    </Card>
  );
}

function OwnerCard({
  account,
  ownerOtpHint,
  editable,
}: {
  account: AdminAccountRow;
  ownerOtpHint: string;
  editable: boolean;
}) {
  const [state, submit] = useActionState(ownerEditAction, initialOwnerEditState);
  const [open, setOpen] = useState(false);

  return (
    <Card as="li" className="flex flex-col gap-3 border-brand/30 bg-brand-soft/30">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-white text-brand">
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{account.name}</p>
          <p className="text-xs text-ink-muted">{account.username}</p>
        </div>
        <Badge tone="brand">Owner</Badge>
        <span className="text-sm text-ink-muted">All pages</span>
        {editable ? (
          <Button size="sm" variant="ghost" onClick={() => setOpen((value) => !value)}>
            <Pencil className="size-4" />
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-ink-soft">
        Changing the owner account needs a code sent to {ownerOtpHint}.
      </p>

      {open && editable ? (
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          {state.step === "idle" ? (
            <form action={submit}>
              <input type="hidden" name="intent" value="send_code" />
              <Pending type="submit" size="sm">
                Send code to {ownerOtpHint}
              </Pending>
            </form>
          ) : state.step === "done" ? (
            <p className="text-sm text-success">{state.success}</p>
          ) : (
            <form action={submit} className="flex flex-col gap-3">
              <input type="hidden" name="intent" value="save" />

              {state.devCode ? (
                <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
                  Development mode: the code is <strong>{state.devCode}</strong>
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <label>
                  <span className="mb-1 block text-xs font-medium text-ink-soft">Name</span>
                  <input name="name" defaultValue={account.name} className={inputClasses} />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-ink-soft">Username</span>
                  <input name="username" defaultValue={account.username} className={inputClasses} />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-medium text-ink-soft">
                    New password (optional)
                  </span>
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    className={inputClasses}
                  />
                </label>
              </div>

              <label className="max-w-xs">
                <span className="mb-1 block text-xs font-medium text-ink-soft">
                  Code sent to {state.maskedPhone ?? ownerOtpHint}
                </span>
                <input
                  name="code"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="000000"
                  className={inputClasses}
                />
              </label>

              <Pending type="submit" size="sm">
                Verify and save
              </Pending>
            </form>
          )}

          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}
