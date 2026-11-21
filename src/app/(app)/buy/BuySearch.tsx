"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ComboBox } from "@/components/ui/ComboBox";
import { Card } from "@/components/ui/Primitives";

/**
 * PRD section 4: search by university and course. The university defaults to
 * the one chosen at registration, and the student can change it to look at
 * other universities.
 */
export function BuySearch({
  tab,
  defaultCollege,
  defaultCourse,
  homeCollege,
}: {
  tab: string;
  defaultCollege: string;
  defaultCourse: string;
  homeCollege: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(
    defaultCollege !== homeCollege || defaultCourse.length > 0,
  );
  const [college, setCollege] = useState(defaultCollege);
  const [course, setCourse] = useState(defaultCourse);

  function apply() {
    const params = new URLSearchParams({ tab });
    if (college.trim()) params.set("college", college.trim());
    if (course.trim()) params.set("course", course.trim());
    router.push(`/buy?${params.toString()}`);
  }

  function reset() {
    setCollege(homeCollege);
    setCourse("");
    router.push(`/buy?tab=${tab}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-left text-sm text-ink-muted hover:border-line-strong"
      >
        <Search className="size-4" />
        Showing {homeCollege}. Search another university or a course.
      </button>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Search listings</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-ink-muted hover:text-ink"
          aria-label="Close search"
        >
          <X className="size-4" />
        </button>
      </div>

      <ComboBox
        label="University"
        name="college"
        list="college"
        value={college}
        onChange={setCollege}
        placeholder="Any university"
        hint="Your own university is selected by default."
      />

      <ComboBox
        label="Course"
        name="course"
        list="course"
        value={course}
        onChange={setCourse}
        placeholder="Any course"
      />

      <div className="flex gap-2">
        <Button type="button" onClick={apply} fullWidth>
          Search
        </Button>
        <Button type="button" variant="secondary" onClick={reset}>
          Reset
        </Button>
      </div>
    </Card>
  );
}
