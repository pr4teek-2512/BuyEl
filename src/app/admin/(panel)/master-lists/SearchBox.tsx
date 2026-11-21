"use client";

import { Search } from "lucide-react";
import { inputClasses } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function SearchBox({ tab, defaultValue }: { tab: string; defaultValue: string }) {
  return (
    <form method="get" action="/admin/master-lists" className="flex gap-2">
      <input type="hidden" name="tab" value={tab} />
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder="Search by name or short form"
          className={cn(inputClasses, "pl-9")}
          aria-label="Search the master list"
        />
      </div>
      <Button type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}
