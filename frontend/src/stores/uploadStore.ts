import { create } from "zustand";
import { api } from "@/api/client";
import type {
  CloudProvider,
  DocumentStatus,
  ProcessingEvent,
  UploadItem,
} from "@/types";
import { toast } from "./toastStore";

const CLOUD_BY_EVENT: Record<string, CloudProvider> = {
  STORED_AWS: "AWS",
  STORED_AZURE: "AZURE",
  STORED_GCP: "GCP",
  STORED_OCI: "OCI",
};

const STATUS_BY_EVENT: Record<string, DocumentStatus> = {
  AI_COMPLETE: "READY",
  FAILED: "FAILED",
};

interface UploadStore {
  items: UploadItem[];
  addFiles: (files: File[]) => Promise<void>;
  applyEvent: (event: ProcessingEvent) => void;
  clearCompleted: () => void;
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  items: [],

  async addFiles(files) {
    for (const file of files) {
      try {
        const { documentId } = await api.uploadDocument(file);
        const item: UploadItem = {
          documentId,
          fileName: file.name,
          fileSizeBytes: file.size,
          progress: 0,
          status: "UPLOADING",
          clouds: { AWS: false, AZURE: false, GCP: false, OCI: false },
        };
        set((s) => ({ items: [item, ...s.items] }));
      } catch (e) {
        toast.error(
          `Upload failed: ${file.name}`,
          e instanceof Error ? e.message : "Unknown error",
        );
      }
    }
  },

  applyEvent(event) {
    const item = get().items.find((i) => i.documentId === event.documentId);

    if (event.eventType === "AI_COMPLETE" && item) {
      toast.success("Processing complete", item.fileName);
    }
    if (event.eventType === "FAILED" && item) {
      toast.error("Processing failed", event.message);
    }

    set((s) => ({
      items: s.items.map((existing) => {
        if (existing.documentId !== event.documentId) return existing;
        const cloud = CLOUD_BY_EVENT[event.eventType];
        return {
          ...existing,
          progress: Math.max(existing.progress, event.progress),
          status: STATUS_BY_EVENT[event.eventType] ?? "PROCESSING",
          clouds: cloud
            ? { ...existing.clouds, [cloud]: true }
            : existing.clouds,
        };
      }),
    }));
  },

  clearCompleted() {
    set((s) => ({ items: s.items.filter((i) => i.status !== "READY") }));
  },
}));
