import { Download, Share2, Archive, Trash2, X } from "lucide-react";
import { toast } from "@/stores/toastStore";

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
}

/** Floating action bar shown while documents are selected. */
export function BulkActionBar({
  count,
  onClear,
}: Readonly<BulkActionBarProps>) {
  if (count === 0) return null;

  const act = (verb: string) => () => {
    toast.info(
      `${verb} ${count} document${count > 1 ? "s" : ""}`,
      "Queued across all clouds.",
    );
    onClear();
  };

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <div className="card-glass pointer-events-auto flex animate-fade-slide-up items-center gap-1 p-1.5 shadow-2xl">
        <span className="px-2.5 text-small font-medium text-content-primary">
          {count} selected
        </span>
        <span className="mx-1 h-5 w-px bg-edge" />
        <button
          type="button"
          onClick={act("Downloading")}
          className="btn-subtle"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </button>
        <button type="button" onClick={act("Sharing")} className="btn-subtle">
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
        <button type="button" onClick={act("Archiving")} className="btn-subtle">
          <Archive className="h-3.5 w-3.5" /> Archive
        </button>
        <button
          type="button"
          onClick={act("Deleting")}
          className="btn-subtle text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
        <span className="mx-1 h-5 w-px bg-edge" />
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="btn-subtle"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
