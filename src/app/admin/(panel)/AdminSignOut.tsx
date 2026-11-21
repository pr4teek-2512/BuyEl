"use client";

import { Button } from "@/components/ui/Button";
import { adminSignOutAction } from "./actions";

export function AdminSignOut() {
  return (
    <form action={adminSignOutAction}>
      <Button type="submit" variant="secondary" size="sm">
        Sign out
      </Button>
    </form>
  );
}
