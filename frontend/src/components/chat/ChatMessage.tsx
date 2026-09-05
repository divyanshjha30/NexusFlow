import { Bot, User } from "lucide-react";
import type { ChatMessageDto } from "@/types";
import { cn } from "@/lib/utils";
import { SourceCitation } from "./SourceCitation";

export function ChatMessage({
  message,
}: Readonly<{ message: ChatMessageDto }>) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex animate-fade-slide-up gap-2",
        isUser && "flex-row-reverse",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          isUser ? "bg-brand text-white" : "bg-surface-raised text-brand-light",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>

      <div
        className={cn(
          "min-w-0 max-w-[85%] space-y-2",
          isUser && "flex flex-col items-end",
        )}
      >
        <div
          className={cn(
            "whitespace-pre-wrap rounded-xl px-3 py-2 text-small leading-relaxed",
            isUser
              ? "bg-brand text-white"
              : "border border-edge bg-surface text-content-primary",
          )}
        >
          {message.content}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="space-y-1">
            <p className="text-caption uppercase tracking-wide text-content-muted">
              {message.sources.length} source
              {message.sources.length > 1 ? "s" : ""}
            </p>
            {message.sources.map((source) => (
              <SourceCitation key={source.documentId} source={source} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
