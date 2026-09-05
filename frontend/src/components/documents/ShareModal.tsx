import { useState } from "react";
import { Copy, Check, Link2, Mail } from "lucide-react";
import type { DocumentDto } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils";

const EXPIRY_OPTIONS = [
  { label: "1 hour", hours: 1 },
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 168 },
  { label: "Never", hours: 0 },
];

interface ShareModalProps {
  document: DocumentDto | null;
  onClose: () => void;
}

export function ShareModal({
  document: doc,
  onClose,
}: Readonly<ShareModalProps>) {
  const [permission, setPermission] = useState<"VIEW" | "DOWNLOAD">("VIEW");
  const [expiryHours, setExpiryHours] = useState(24);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  if (!doc) return null;

  const token = doc.id.slice(0, 8);
  const shareUrl = `${window.location.origin}/share/${token}`;
  const expiresAt =
    expiryHours > 0
      ? new Date(Date.now() + expiryHours * 3600_000).toLocaleString()
      : "Never expires";

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Share link copied");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Share document"
      description={doc.fileName}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              toast.success(
                email ? `Invite sent to ${email}` : "Share link created",
                `${permission === "VIEW" ? "View only" : "View and download"} · ${expiresAt}`,
              );
              onClose();
            }}
            className="btn-primary"
          >
            {email ? "Send invite" : "Create link"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-edge bg-surface-raised p-2">
          <Link2 className="h-4 w-4 shrink-0 text-content-muted" />
          <code className="min-w-0 flex-1 truncate font-mono text-caption text-content-secondary">
            {shareUrl}
          </code>
          <button
            type="button"
            onClick={copyLink}
            className="btn-subtle shrink-0"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Copy
          </button>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-caption uppercase tracking-wide text-content-muted">
            Permission
          </legend>
          <div className="flex gap-2">
            {(["VIEW", "DOWNLOAD"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPermission(p)}
                className={cn("chip", permission === p && "chip-active")}
              >
                {p === "VIEW" ? "View only" : "View & download"}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-caption uppercase tracking-wide text-content-muted">
            Expires
          </legend>
          <div className="flex flex-wrap gap-2">
            {EXPIRY_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setExpiryHours(opt.hours)}
                className={cn(
                  "chip",
                  expiryHours === opt.hours && "chip-active",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-caption text-content-muted">{expiresAt}</p>
        </fieldset>

        <div>
          <label
            htmlFor="share-email"
            className="mb-1.5 block text-caption uppercase tracking-wide text-content-muted"
          >
            Invite by email <span className="normal-case">(optional)</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
            <input
              id="share-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="input pl-8"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
