import { NextResponse } from "next/server";
import { sweepExpiredBoosts } from "@/server/services/payment.service";

export const dynamic = "force-dynamic";

/**
 * Nightly tidy up of boosts that have run out (PRD section 8).
 *
 * Expiry is already honoured when listings are read, so the feed is correct
 * even if this never runs. This only clears the flags and tells the seller.
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
    const swept = await sweepExpiredBoosts();
    return NextResponse.json({ ok: true, swept });
  } catch (error) {
    console.error("[cron] boost sweep failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
