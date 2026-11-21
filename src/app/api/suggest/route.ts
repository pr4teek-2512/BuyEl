import { NextResponse } from "next/server";
import {
  suggestBranches,
  suggestColleges,
  suggestCourses,
} from "@/server/services/masterlist.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const list = searchParams.get("list");
  const query = (searchParams.get("q") ?? "").slice(0, 80);

  if (query.trim().length === 0) {
    return NextResponse.json({ options: [] });
  }

  try {
    const options =
      list === "college"
        ? await suggestColleges(query)
        : list === "branch"
          ? await suggestBranches(query)
          : list === "course"
            ? await suggestCourses(query)
            : null;

    if (!options) {
      return NextResponse.json({ error: "Unknown list" }, { status: 400 });
    }

    return NextResponse.json({ options });
  } catch (error) {
    console.error("[suggest] failed", error);
    return NextResponse.json({ options: [] });
  }
}
