"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { adminLoginAction } from "./actions";
import { initialAdminLoginState } from "./state";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth loading={pending}>
      Sign in
    </Button>
  );
}

export function AdminLoginForm() {
  const [state, submit] = useActionState(adminLoginAction, initialAdminLoginState);

  return (
    <form action={submit} className="mt-6 flex flex-col gap-4">
      <TextField label="Username" name="username" autoComplete="username" required />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {state.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
