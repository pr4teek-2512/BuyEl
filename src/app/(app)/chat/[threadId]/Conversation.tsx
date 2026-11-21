"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { sendMessageAction } from "./actions";

export type ChatMessage = {
  id: string;
  mine: boolean;
  body: string;
  createdAt: string;
};

const POLL_INTERVAL_MS = 3000;

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function Conversation({
  threadId,
  initialMessages,
}: {
  threadId: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef<string | undefined>(initialMessages.at(-1)?.createdAt);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // New messages arrive by polling. See Plan.md for why this is not Supabase
  // Realtime: that would need the anon key to read the messages table.
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const query = latestRef.current ? `?after=${encodeURIComponent(latestRef.current)}` : "";
        const response = await fetch(`/api/chat/${threadId}/messages${query}`, {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;

        const data = (await response.json()) as { messages: ChatMessage[] };
        if (data.messages.length === 0 || cancelled) return;

        latestRef.current = data.messages.at(-1)?.createdAt ?? latestRef.current;
        setMessages((current) => {
          const known = new Set(current.map((message) => message.id));
          const fresh = data.messages.filter((message) => !known.has(message.id));
          return fresh.length > 0 ? [...current, ...fresh] : current;
        });
      } catch {
        // offline for a moment; the next tick retries
      }
    }

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [threadId]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError(null);
    setDraft("");

    const result = await sendMessageAction(threadId, body);

    if (result.error) {
      setError(result.error);
      setDraft(body);
    } else if (result.message) {
      latestRef.current = result.message.createdAt;
      setMessages((current) =>
        current.some((item) => item.id === result.message!.id)
          ? current
          : [...current, result.message!],
      );
    }

    setSending(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-[40vh] flex-col gap-2 rounded-2xl border border-line bg-surface-soft p-3">
        {messages.length === 0 ? (
          <p className="m-auto max-w-xs text-center text-sm text-ink-muted">
            No messages yet. Say hello and ask about the course.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex", message.mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                  message.mine
                    ? "bg-brand text-white"
                    : "border border-line bg-white text-ink",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <p
                  className={cn(
                    "mt-1 text-[11px]",
                    message.mine ? "text-white/70" : "text-ink-muted",
                  )}
                >
                  {timeLabel(message.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <form onSubmit={send} className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message"
          maxLength={2000}
          className={cn(inputClasses, "flex-1")}
          aria-label="Message"
        />
        <Button type="submit" loading={sending} aria-label="Send">
          <SendHorizontal className="size-4" />
        </Button>
      </form>
    </div>
  );
}
