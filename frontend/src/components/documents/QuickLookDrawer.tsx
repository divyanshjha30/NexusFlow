import { Link } from "react-router-dom";
import { ArrowUpRight, Download, Share2, GitCompare } from "lucide-react";
import type { DocumentDto } from "@/types";
import { formatBytes, formatDate } from "@/lib/utils";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { AiSummaryCard } from "./AiSummaryCard";
import { EntityList } from "./EntityList";
import { StorageLocations } from "./StorageLocations";
import { FileTypeIcon } from "@/components/ui/FileTypeIcon";
import { toast } from "@/stores/toastStore";

interface QuickLookDrawerProps {
  document: DocumentDto | null;
  onClose: () => void;
  onShare: (doc: DocumentDto) => void;
}

export function QuickLookDrawer({
  document: doc,
  onClose,
  onShare,
}: Readonly<QuickLookDrawerProps>) {
  if (!doc) return null;

  return (
    <Drawer
      open
      onClose={onClose}
      title={doc.fileName}
      subtitle={`${formatBytes(doc.fileSizeBytes)} · ${doc.mimeType} · ${formatDate(doc.createdAt)}`}
      footer={
        <>
          <Link to={`/documents/${doc.id}`} className="btn-primary flex-1">
            Open full view <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => toast.success("Download started", doc.fileName)}
            className="btn-ghost"
            aria-label="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onShare(doc)}
            className="btn-ghost"
            aria-label="Share"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <Link
            to={`/compare?a=${doc.id}`}
            className="btn-ghost"
            aria-label="Compare"
          >
            <GitCompare className="h-3.5 w-3.5" />
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-edge bg-surface-raised p-3">
          <span className="rounded-lg bg-surface p-2 text-brand-light">
            <FileTypeIcon document={doc} className="h-6 w-6" />
          </span>
          <div className="flex flex-wrap gap-1">
            <Badge variant={doc.status} />
            {doc.documentType && <Badge variant={doc.documentType} />}
            {doc.sentiment && <Badge variant={doc.sentiment} />}
          </div>
        </div>

        <AiSummaryCard summary={doc.summary} status={doc.status} />

        {doc.aiTags.length > 0 && (
          <section className="space-y-1.5">
            <h3 className="text-caption uppercase tracking-wide text-content-muted">
              Tags
            </h3>
            <div className="flex flex-wrap gap-1">
              {doc.aiTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-brand/15 px-1.5 py-0.5 text-caption text-brand-light"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-1.5">
          <h3 className="text-caption uppercase tracking-wide text-content-muted">
            Entities
          </h3>
          <EntityList entities={doc.entities} />
        </section>

        <section className="space-y-1.5">
          <h3 className="text-caption uppercase tracking-wide text-content-muted">
            Storage
          </h3>
          <StorageLocations document={doc} />
        </section>
      </div>
    </Drawer>
  );
}
