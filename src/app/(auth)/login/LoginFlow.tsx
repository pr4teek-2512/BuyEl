"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ComboBox } from "@/components/ui/ComboBox";
import { TextField } from "@/components/ui/Field";
import { authAction, initialAuthState, type AuthState } from "./actions";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth loading={pending}>
      {children}
    </Button>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

export function LoginFlow() {
  const [state, submit] = useActionState(authAction, initialAuthState);

  if (state.step === "otp") return <OtpStep state={state} submit={submit} />;
  if (state.step === "profile") return <ProfileStep state={state} submit={submit} />;
  return <PhoneStep state={state} submit={submit} />;
}

type StepProps = {
  state: AuthState;
  submit: (formData: FormData) => void;
};

function PhoneStep({ state, submit }: StepProps) {
  return (
    <div className="animate-fade-up">
      <h1 className="text-2xl font-semibold tracking-tight">Enter your mobile number</h1>
      <p className="mt-2 text-sm text-ink-muted">
        We send a 6 digit code every time you sign in. No passwords to remember.
      </p>

      <form action={submit} className="mt-7 flex flex-col gap-4">
        <input type="hidden" name="intent" value="request_otp" />
        <TextField
          label="Mobile number"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="98765 43210"
          defaultValue={state.phone.replace("+91", "")}
          required
        />
        <ErrorText message={state.error} />
        <SubmitButton>Send code</SubmitButton>
      </form>
    </div>
  );
}

function OtpStep({ state, submit }: StepProps) {
  return (
    <div className="animate-fade-up">
      <form action={submit}>
        <input type="hidden" name="intent" value="change_number" />
        <button
          type="submit"
          className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Change number
        </button>
      </form>

      <h1 className="text-2xl font-semibold tracking-tight">Enter the code</h1>
      <p className="mt-2 text-sm text-ink-muted">Sent to {state.phone}.</p>

      {state.devCode ? (
        <p className="mt-3 rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
          Development mode: your code is <strong>{state.devCode}</strong>
        </p>
      ) : null}

      <form action={submit} className="mt-7 flex flex-col gap-4">
        <input type="hidden" name="intent" value="verify_otp" />
        <TextField
          label="6 digit code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          className="tracking-[0.5em]"
          required
        />
        <ErrorText message={state.error} />
        <SubmitButton>Verify and continue</SubmitButton>
      </form>

      <form action={submit} className="mt-3">
        <input type="hidden" name="intent" value="resend_otp" />
        <button type="submit" className="text-sm text-brand hover:underline">
          Resend code
        </button>
      </form>
    </div>
  );
}

function ProfileStep({ state, submit }: StepProps) {
  const [college, setCollege] = useState("");
  const [branch, setBranch] = useState("");
  const currentYear = new Date().getFullYear();

  return (
    <div className="animate-fade-up">
      <h1 className="text-2xl font-semibold tracking-tight">Complete your profile</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {state.phone} is verified. You only fill this in once.
      </p>

      <form action={submit} className="mt-7 flex flex-col gap-4">
        <input type="hidden" name="intent" value="complete_profile" />

        <TextField label="First name" name="name" autoComplete="given-name" required />
        <TextField label="Last name (optional)" name="lastName" autoComplete="family-name" />

        <ComboBox
          label="University or college"
          name="college"
          list="college"
          value={college}
          onChange={setCollege}
          placeholder="Start typing, for example DTU"
          hint="Full name or short form. Not in the list? Type it and we will save it."
          required
        />

        <ComboBox
          label="Branch"
          name="branch"
          list="branch"
          value={branch}
          onChange={setBranch}
          placeholder="Civil Engineering"
          required
        />

        <TextField
          label="Expected graduation year"
          name="graduationYear"
          type="number"
          inputMode="numeric"
          min={currentYear - 10}
          max={currentYear + 10}
          defaultValue={currentYear + 2}
          required
        />

        <ErrorText message={state.error} />
        <SubmitButton>Create my account</SubmitButton>
      </form>
    </div>
  );
}
