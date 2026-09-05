import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Bot } from "lucide-react";
import { api } from "@/api/client";
import { useChatStore } from "@/stores/chatStore";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Summarise all my contracts",
  "What invoices are unpaid?",
  "Find documents mentioning Acme Corp",
];

export function AIChat() {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useChatStore((s) => s.messages);
  const sending = useChatStore((s) => s.sending);
  const send = useChatStore((s) => s.send);
  const selected = useChatStore((s) => s.selectedDocumentIds);
  const toggle = useChatStore((s) => s.toggleDocument);

  const { data } = useQuery({
    queryKey: ["documents", "chat-context"],
    queryFn: () =>
      api.listDocuments({
        page: 0,
        size: 50,
        sort: "createdAt",
        direction: "desc",
      }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  function submit(text: string) {
    if (!text.trim()) return;
    void send(text);
    setDraft("");
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[240px_1fr]">
      <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border-r border-edge bg-surface/50 p-4">
        <div>
          <h2 className="text-caption uppercase tracking-wide text-content-muted">
            Context
          </h2>
          <p className="mt-1 text-small text-content-secondary">
            {selected.length === 0
              ? `All documents (${data?.totalElements ?? 0})`
              : `${selected.length} selected`}
          </p>
        </div>

        <ul className="space-y-1">
          {data?.content.map((doc) => (
            <li key={doc.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-raised">
                <input
                  type="checkbox"
                  checked={selected.includes(doc.id)}
                  onChange={() => toggle(doc.id)}
                  className="accent-brand"
                />
                <span className="truncate text-caption text-content-secondary">
                  {doc.fileName}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          {messages.length === 0 && (
            <div className="mx-auto max-w-md space-y-4 pt-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-raised text-brand-light">
                <Bot className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-lg font-semibold">
                  Ask about your documents
                </h1>
                <p className="mt-1 text-small text-content-secondary">
                  Answers are grounded in your library and always cite their
                  sources.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="btn-ghost justify-start"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {sending && (
            <div className="flex items-center gap-2 text-small text-content-muted">
              <Spinner /> Thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(draft);
          }}
          className="border-t border-edge p-4"
        >
          <div className="flex items-center gap-2">
            <input
              className="input"
              placeholder="Type a message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className={cn("btn-primary shrink-0")}
            >
              Send <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
