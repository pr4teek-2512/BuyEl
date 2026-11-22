"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { ComboBox } from "@/components/ui/ComboBox";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { createListingAction } from "./actions";
import { ShareListingDialog } from "./ShareListingDialog";
import { initialSellState, type SellFormState } from "./state";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="flex-1" loading={pending}>
      Confirm listing
    </Button>
  );
}

export function CreateListingForm({ defaultCollege }: { defaultCollege: string }) {
  const [state, submit] = useActionState(createListingAction, initialSellState);
  const [course, setCourse] = useState("");
  const [college, setCollege] = useState(defaultCollege);
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState<{ course: string; college: string } | null>(null);

  // The action returns a fresh object every run, so comparing identity tells a
  // new success apart from the one already turned into a share popup.
  const handled = useRef<SellFormState | null>(null);

  useEffect(() => {
    if (!state.success || handled.current === state) return;
    handled.current = state;
    setOpen(false);
    setShared({ course, college });
  }, [state, course, college]);

  function openForm() {
    setCourse("");
    setCollege(defaultCollege);
    setShared(null);
    setOpen(true);
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-30 sm:bottom-6">
        <div className="mx-auto w-full max-w-3xl px-4">
          <Button onClick={openForm} fullWidth size="lg" className="pointer-events-auto shadow-lg">
            List a course
          </Button>
        </div>
      </div>

      {open ? (
        <Modal
          title="List a course"
          description="Listing is free. The course and college cannot be changed afterwards, so check them before you confirm."
          onClose={() => setOpen(false)}
        >
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

            <div className="flex gap-2">
              <SubmitButton />
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {shared ? (
        <ShareListingDialog
          course={shared.course}
          college={shared.college}
          onClose={() => setShared(null)}
        />
      ) : null}
    </>
  );
}
