"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { ComboBox } from "@/components/ui/ComboBox";
import { TextField } from "@/components/ui/Field";
import { Card } from "@/components/ui/Primitives";
import { createListingAction } from "./actions";
import { initialSellState } from "./state";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth loading={pending}>
      Confirm listing
    </Button>
  );
}

export function CreateListingForm({ defaultCollege }: { defaultCollege: string }) {
  const [state, submit] = useActionState(createListingAction, initialSellState);
  const [course, setCourse] = useState("");
  const [college, setCollege] = useState(defaultCollege);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-30 sm:bottom-6">
        <div className="mx-auto w-full max-w-3xl px-4">
          <Button
            onClick={() => setOpen(true)}
            fullWidth
            size="lg"
            className="pointer-events-auto shadow-lg"
          >
            List a course
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="font-medium">List a course</p>
        <p className="mt-0.5 text-sm text-ink-muted">
          Listing is free. The course and college cannot be changed afterwards, so check them
          before you confirm.
        </p>
      </div>

      <form action={submit} className="flex flex-col gap-4">
        <ComboBox
          label="Course"
          name="course"
          list="course"
          value={course}
          onChange={setCourse}
          placeholder="Data Structures CS201"
          hint="Not in the list? Type it and we will save it."
          required
        />

        <ComboBox
          label="College"
          name="college"
          list="college"
          value={college}
          onChange={setCollege}
          placeholder="Start typing, for example DTU"
          required
        />

        <TextField
          label="Price"
          name="price"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="499"
          hint="In rupees. You can change this later."
          required
        />

        {state.error ? (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="rounded-xl bg-success-soft px-3 py-2 text-sm text-success">
            {state.success}
          </p>
        ) : null}

        <div className="flex gap-2">
          <SubmitButton />
          <Button type="button" variant="secondary" size="lg" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
