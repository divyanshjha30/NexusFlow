import { useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";
import { useUploadStore } from "@/stores/uploadStore";
import { toast } from "@/stores/toastStore";

/** Full-window drop target so files can be dragged anywhere in the app. */
export function GlobalDropOverlay() {
  const [active, setActive] = useState(false);
  const addFiles = useUploadStore((s) => s.addFiles);

  useEffect(() => {
    let depth = 0;

    const onEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      depth += 1;
      setActive(true);
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setActive(false);
    };
    const onOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setActive(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) {
        void addFiles(files);
        toast.success(
          `Uploading ${files.length} file${files.length > 1 ? "s" : ""}`,
          "Replicating across AWS, Azure, GCP and OCI.",
        );
      }
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [addFiles]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-canvas/70 backdrop-blur-sm">
      <div className="flex animate-scale-in flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand bg-surface/80 px-14 py-10">
        <UploadCloud className="h-10 w-10 animate-float text-brand" />
        <p className="text-body font-medium text-content-primary">
          Drop to upload
        </p>
        <p className="text-small text-content-secondary">
          Stored to all four clouds simultaneously
        </p>
      </div>
    </div>
  );
}
