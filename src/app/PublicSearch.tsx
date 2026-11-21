"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ComboBox } from "@/components/ui/ComboBox";

/**
 * PRD section 14: visitors can search before creating an account.
 * No login, no credits, just the listings.
 */
export function PublicSearch({
  defaultCollege,
  defaultCourse,
}: {
  defaultCollege: string;
  defaultCourse: string;
}) {
  const router = useRouter();
  const [college, setCollege] = useState(defaultCollege);
  const [course, setCourse] = useState(defaultCourse);

  function search() {
    const params = new URLSearchParams();
    if (college.trim()) params.set("college", college.trim());
    if (course.trim()) params.set("course", course.trim());
    router.push(params.size > 0 ? `/?${params.toString()}#results` : "/");
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <ComboBox
          label="College or university"
          name="college"
          list="college"
          value={college}
          onChange={setCollege}
          placeholder="Type a name or short form, for example DTU"
        />

        <ComboBox
          label="Course"
          name="course"
          list="course"
          value={course}
          onChange={setCourse}
          placeholder="Any course"
        />

        <Button size="lg" onClick={search}>
          <Search className="size-4" />
          Search
        </Button>
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        No account needed to look. You only sign in when you want to message a seller.
      </p>
    </div>
  );
}
