import { NextResponse } from "next/server";
import { runChatRetention } from "@/server/services/retention.service";

export const dynamic = "force-dynamic";

/**
 * Daily chat cleanup: inactive chats are deleted from crowded lists, and every
 * chat is trimmed back to its newest messages. Both deletions are permanent.
 *
 * Scheduled in vercel.json; Vercel sends CRON_SECRET as a bearer token.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const report = await runChatRetention();
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error("[cron] chat retention failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
