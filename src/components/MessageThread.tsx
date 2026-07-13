import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { api, type Message } from "@/lib/api";
import { cn, relativeTime } from "@/lib/utils";
import { useToast } from "@/lib/toast";

/**
 * Shared question-and-answer thread between a school and Peek. School always
 * reads/writes its own organization's thread; admin passes orgId to view a
 * specific school's thread. viewerRole decides which side "my" messages sit
 * on, independent of who technically owns the thread.
 */
export function MessageThread({ orgId, viewerRole, emptyText }: {
  orgId?: string;
  viewerRole: "school" | "admin";
  emptyText?: string;
}) {
  const toast = useToast();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const qs = orgId ? `?orgId=${orgId}` : "";
      const { messages } = await api.get<{ messages: Message[] }>(`/api/messages${qs}`);
      setMessages(messages);
    } catch (e: any) {
      setError(e.message);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages?.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    try {
      await api.post("/api/messages", { body: value, ...(orgId ? { orgId } : {}) });
      setText("");
      await load();
    } catch (e: any) {
      toast.push("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto py-1">
        {!messages && <div className="grid place-items-center py-10"><span className="loader" /></div>}
        {messages && messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">{emptyText ?? "No messages yet."}</p>
        )}
        {messages?.map((m) => {
          const mine = m.senderRole === viewerRole;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm",
                mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              )}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                <p className={cn("mt-1 text-[0.68rem]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {m.senderRole === "admin" ? "Peek Vision" : "School"} · {relativeTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p role="alert" className="mb-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p>}

      <form onSubmit={send} className="mt-2 flex gap-2 border-t border-border pt-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Type a message…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(e as unknown as React.FormEvent);
            }
          }}
          className="flex-1 resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <button
          type="submit" disabled={busy || !text.trim()} aria-label="Send message"
          className="flex-none rounded-lg bg-primary px-3.5 text-primary-foreground transition hover:bg-primary-600 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
