"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { FlaskConical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { Badge, Card } from "@/components/ui/Primitives";
import { deleteTestAccountAction, saveTestAccountAction } from "./actions";
import { initialFormState, type FormState } from "../master-lists/state";

export type TestAccountRow = {
  id: string;
  name: string;
  phone: string;
  fixedOtp: string;
  canAccessPaidServices: boolean;
  testModeOn: boolean;
  redoOnboarding: boolean;
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

function Toggles({ account }: { account?: TestAccountRow }) {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="canAccessPaidServices"
          defaultChecked={account?.canAccessPaidServices}
        />
        Can access paid services
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="testModeOn" defaultChecked={account?.testModeOn ?? true} />
        Test mode on
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="redoOnboarding" defaultChecked={account?.redoOnboarding} />
        Redo onboarding
      </label>
    </div>
  );
}

export function TestAccounts({
  accounts,
  editable,
}: {
  accounts: TestAccountRow[];
  editable: boolean;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <FlaskConical className="size-4 text-brand" />
            Test accounts
          </h2>
          <p className="text-sm text-ink-muted">
            These numbers sign in with a fixed code and never trigger a real SMS, so they cost
            nothing to use. The number does not have to be a working mobile number. Students
            created from a test account are left out of the dashboard counts.
          </p>
        </div>
        {editable ? (
          <Button size="sm" onClick={() => setAdding((value) => !value)}>
            {adding ? "Cancel" : "New test account"}
          </Button>
        ) : null}
      </div>

      {adding ? <TestAccountForm onDone={() => setAdding(false)} /> : null}

      {accounts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong bg-white px-4 py-5 text-sm text-ink-muted">
          No test accounts yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {accounts.map((account) => (
            <TestAccountCard key={account.id} account={account} editable={editable} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TestAccountForm({ onDone }: { onDone: () => void }) {
  const [state, submit] = useActionState(saveTestAccountAction, initialFormState);

  return (
    <Card className="flex flex-col gap-3">
      <form action={submit} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-soft">Name</span>
            <input name="name" required placeholder="Developer Test 3" className={inputClasses} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-soft">Number</span>
            <input name="phone" required placeholder="0000000003" className={inputClasses} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-soft">Fixed OTP</span>
            <input
              name="fixedOtp"
              required
              inputMode="numeric"
              maxLength={6}
              placeholder="030030"
              className={inputClasses}
            />
          </label>
        </div>

        <Toggles />

        <div className="flex gap-2">
          <Pending type="submit">Create test account</Pending>
          <Button type="button" variant="secondary" onClick={onDone}>
            Close
          </Button>
        </div>

        <Feedback state={state} />
      </form>
    </Card>
  );
}

function TestAccountCard({
  account,
  editable,
}: {
  account: TestAccountRow;
  editable: boolean;
}) {
  const [saveState, save] = useActionState(saveTestAccountAction, initialFormState);
  const [deleteState, remove] = useActionState(deleteTestAccountAction, initialFormState);

  if (!editable) {
    return (
      <Card as="li" className="flex items-center gap-3">
        <span className="flex-1 font-medium">{account.name}</span>
        <span className="text-sm text-ink-muted">{account.phone}</span>
      </Card>
    );
  }

  return (
    <Card as="li" className="flex flex-col gap-3">
      <form action={save} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={account.id} />

        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-soft">Name</span>
            <input name="name" defaultValue={account.name} className={inputClasses} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-soft">Number</span>
            <input name="phone" defaultValue={account.phone} className={inputClasses} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-soft">Fixed OTP</span>
            <input
              name="fixedOtp"
              defaultValue={account.fixedOtp}
              inputMode="numeric"
              maxLength={6}
              className={`${inputClasses} font-mono`}
            />
          </label>
        </div>

        <Toggles account={account} />

        <div className="flex flex-wrap items-center gap-2">
          {account.canAccessPaidServices ? (
            <Badge tone="warning">Paid services on</Badge>
          ) : (
            <Badge tone="neutral">Paid services off</Badge>
          )}
          <Pending type="submit" size="sm" className="ml-auto">
            Save
          </Pending>
        </div>
      </form>

      <form action={remove} className="border-t border-line pt-3">
        <input type="hidden" name="id" value={account.id} />
        <Pending type="submit" size="sm" variant="danger">
          <Trash2 className="size-4" />
          Remove test account
        </Pending>
      </form>

      <Feedback state={saveState.error || saveState.success ? saveState : deleteState} />
    </Card>
  );
}
