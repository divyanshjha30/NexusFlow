import { useState } from "react";
import { Plus, X, Bot } from "lucide-react";

interface TagEditorProps {
  aiTags: string[];
}

export function TagEditor({ aiTags }: Readonly<TagEditorProps>) {
  const [userTags, setUserTags] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    const value = draft.trim().toLowerCase();
    if (value && !userTags.includes(value) && !aiTags.includes(value)) {
      setUserTags((t) => [...t, value]);
    }
    setDraft("");
    setAdding(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {aiTags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-brand-dim/30 px-1.5 py-0.5 text-caption text-brand-light"
          title="Added by AI"
        >
          <Bot className="h-3 w-3" />
          {tag}
        </span>
      ))}

      {userTags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-surface-raised px-1.5 py-0.5 text-caption text-content-secondary"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => setUserTags((t) => t.filter((x) => x !== tag))}
            className="hover:text-content-primary"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft("");
              setAdding(false);
            }
          }}
          placeholder="tag name"
          className="w-24 rounded border border-brand bg-surface px-1.5 py-0.5 text-caption outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded border border-dashed border-edge px-1.5 py-0.5 text-caption text-content-muted hover:border-brand hover:text-brand-light"
        >
          <Plus className="h-3 w-3" />
          Add tag
        </button>
      )}
    </div>
  );
}
