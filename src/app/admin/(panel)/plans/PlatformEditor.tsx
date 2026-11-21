"use client";

import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { Badge, Card } from "@/components/ui/Primitives";
import { savePlatformAction, togglePlatformAction } from "./actions";
import { initialFormState, type FormState } from "../master-lists/state";

export type PlatformRow = {
  id: string;
  name: string;
  logoUrl: string | null;
  utrTerm: string;
  appTxnTerm: string | null;
  explanatoryImageUrl: string | null;
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

const fileInputClass =
  "text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:text-brand";

export function PlatformSection({
  platforms,
  editable,
}: {
  platforms: PlatformRow[];
  editable: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">Payment apps</h2>
        <p className="text-sm text-ink-muted">
          Shown to students after they pick which UPI app they paid with, because every app uses
          a different name for the UTR number and for its own transaction ID. Getting these words
          right is what stops students pasting the wrong number.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {platforms.map((platform) => (
          <PlatformCard key={platform.id} platform={platform} editable={editable} />
        ))}
      </ul>

      {editable ? <NewPlatformForm /> : null}
    </section>
  );
}

function PlatformCard({
  platform,
  editable,
}: {
  platform: PlatformRow;
  editable: boolean;
}) {
  const [saveState, save] = useActionState(savePlatformAction, initialFormState);
  const [toggleState, toggle] = useActionState(togglePlatformAction, initialFormState);
  const feedback = saveState.error || saveState.success ? saveState : toggleState;

  return (
    <Card as="li" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {platform.logoUrl ? (
          <Image
            src={platform.logoUrl}
            alt=""
            width={28}
            height={28}
            className="rounded border border-line object-contain"
          />
        ) : null}
        <p className="font-medium">{platform.name}</p>
        {platform.isActive ? <Badge tone="success">Live</Badge> : <Badge tone="neutral">Hidden</Badge>}
      </div>

      {editable ? (
        <form action={save} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={platform.id} />

          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <span className="mb-1 block text-xs font-medium text-ink-soft">App name</span>
              <input name="name" defaultValue={platform.name} className={inputClasses} />
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-ink-soft">
                Term used for the UTR in this app
              </span>
              <input
                name="utrTerm"
                defaultValue={platform.utrTerm}
                placeholder="UPI transaction ID"
                className={inputClasses}
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-ink-soft">
                Term for its own transaction ID (the one not to paste)
              </span>
              <input
                name="appTxnTerm"
                defaultValue={platform.appTxnTerm ?? ""}
                placeholder="Google transaction ID"
                className={inputClasses}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-ink-soft">
                {platform.logoUrl ? "Replace logo" : "Logo"}
              </span>
              <input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className={fileInputClass} />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-ink-soft">
                {platform.explanatoryImageUrl ? "Replace explanatory image" : "Explanatory image"}
              </span>
              <input name="explanatory" type="file" accept="image/png,image/jpeg,image/webp" className={fileInputClass} />
            </label>

            <label>
              <span className="mb-1 block text-xs font-medium text-ink-soft">Order</span>
              <input
                name="sortOrder"
                type="number"
                defaultValue={platform.sortOrder}
                className={inputClasses}
              />
            </label>
          </div>

          {platform.explanatoryImageUrl ? (
            <Image
              src={platform.explanatoryImageUrl}
              alt={`Where to find the ${platform.utrTerm} in ${platform.name}`}
              width={160}
              height={160}
              className="rounded-lg border border-line object-contain"
            />
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Pending type="submit" size="sm">
              Save
            </Pending>
          </div>
        </form>
      ) : (
        <p className="text-sm text-ink-muted">UTR is called &quot;{platform.utrTerm}&quot; here.</p>
      )}

      {editable ? (
        <form action={toggle} className="border-t border-line pt-3">
          <input type="hidden" name="id" value={platform.id} />
          <Pending type="submit" size="sm" variant="secondary">
            {platform.isActive ? "Hide from students" : "Make live"}
          </Pending>
        </form>
      ) : null}

      <Feedback state={feedback} />
    </Card>
  );
}

function NewPlatformForm() {
  const [state, submit] = useActionState(savePlatformAction, initialFormState);

  return (
    <form
      action={submit}
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-line-strong bg-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          <span className="mb-1 block text-xs font-medium text-ink-soft">App name</span>
          <input name="name" required placeholder="Amazon Pay" className={inputClasses} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-ink-soft">Term for the UTR</span>
          <input name="utrTerm" required placeholder="UPI reference" className={inputClasses} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-ink-soft">
            Term for its own transaction ID
          </span>
          <input name="appTxnTerm" placeholder="Order ID" className={inputClasses} />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Logo</span>
          <input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className={fileInputClass} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Explanatory image</span>
          <input name="explanatory" type="file" accept="image/png,image/jpeg,image/webp" className={fileInputClass} />
        </label>
        <Pending type="submit" className="ml-auto">
          Add app
        </Pending>
      </div>

      <Feedback state={state} />
    </form>
  );
}
