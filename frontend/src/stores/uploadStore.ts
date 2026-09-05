import { create } from "zustand";
import { api } from "@/api/client";
import type {
  CloudProvider,
  DocumentStatus,
  ProcessingEvent,
  UploadItem,
} from "@/types";

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

/** Drives the demo progression when no backend events arrive. */
function simulate(documentId: string, apply: (e: ProcessingEvent) => void) {
  const steps: Array<[ProcessingEvent["eventType"], number, string]> = [
    ["STORED_AWS", 25, "Stored to AWS S3 (1/4 clouds)"],
    ["STORED_AZURE", 50, "Stored to Azure Blob (2/4 clouds)"],
    ["STORED_GCP", 75, "Stored to GCP Storage (3/4 clouds)"],
    ["STORED_OCI", 87, "Stored to OCI Object (4/4 clouds)"],
    ["AI_STARTED", 90, "AI pipeline started"],
    ["AI_CLASSIFIED", 93, "Classified as INVOICE"],
    ["AI_SUMMARISED", 96, "Summary generated"],
    ["AI_COMPLETE", 100, "Analysis complete"],
  ];
  steps.forEach(([eventType, progress, message], i) => {
    setTimeout(
      () =>
        apply({
          documentId,
          eventType,
          progress,
          message,
          timestamp: new Date().toISOString(),
        }),
      500 + i * 700,
    );
  });
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  items: [],

  async addFiles(files) {
    for (const file of files) {
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
      simulate(documentId, get().applyEvent);
    }
  },

  applyEvent(event) {
    set((s) => ({
      items: s.items.map((item) => {
        if (item.documentId !== event.documentId) return item;
        const cloud = CLOUD_BY_EVENT[event.eventType];
        const status = STATUS_BY_EVENT[event.eventType] ?? "PROCESSING";
        return {
          ...item,
          progress: Math.max(item.progress, event.progress),
          status,
          documentType:
            event.eventType === "AI_CLASSIFIED" ? "INVOICE" : item.documentType,
          clouds: cloud ? { ...item.clouds, [cloud]: true } : item.clouds,
        };
      }),
    }));
  },

  clearCompleted() {
    set((s) => ({ items: s.items.filter((i) => i.status !== "READY") }));
  },
}));
