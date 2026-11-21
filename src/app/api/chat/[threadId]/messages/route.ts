import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { ChatError, messagesSince } from "@/server/services/chat.service";

export const dynamic = "force-dynamic";

/** Polled by the open conversation. Only a participant ever gets messages. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ messages: [] }, { status: 401 });

  const { threadId } = await params;
  const after = new URL(request.url).searchParams.get("after") ?? undefined;

  try {
    const messages = await messagesSince(user.id, threadId, after);
    return NextResponse.json({ messages });
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ messages: [] }, { status: 404 });
    }
    console.error("[chat] poll failed", error);
    return NextResponse.json({ messages: [] }, { status: 500 });
  }
}
