"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { signOutAction } from "../accountActions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="danger" fullWidth>
        <LogOut className="size-4" />
        Sign out
      </Button>
    </form>
  );
}
