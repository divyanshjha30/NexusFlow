import type {
  ChatMessageDto,
  CloudProvider,
  CloudStatus,
  DocumentDto,
  DocumentFilters,
  Page,
  UserProfile,
} from "@/types";
import {
  MOCK_CHAT_REPLY,
  MOCK_CLOUD_STATUS,
  MOCK_DOCUMENTS,
  MOCK_USER,
} from "./mockData";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
const TIMEOUT_MS = 4000;

/**
 * Tracks whether the backend answered recently. The backend lives behind
 * Tailscale, so the UI falls back to mock data rather than showing errors.
 */
let offline = false;
const listeners = new Set<(v: boolean) => void>();

export function isOffline() {
  return offline;
}

export function onOfflineChange(fn: (v: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function setOffline(value: boolean) {
  if (offline !== value) {
    offline = value;
    listeners.forEach((fn) => fn(value));
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init?.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setOffline(false);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Calls the API, falling back to demo data when the backend is unreachable. */
async function withFallback<T>(
  path: string,
  fallback: () => T,
  init?: RequestInit,
): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch {
    setOffline(true);
    return fallback();
  }
}

function applyFilters(
  docs: DocumentDto[],
  filters: DocumentFilters,
): Page<DocumentDto> {
  let out = docs.filter((d) =>
    filters.archived ? d.status === "ARCHIVED" : d.status !== "ARCHIVED",
  );

  if (filters.type && filters.type !== "ALL")
    out = out.filter((d) => d.documentType === filters.type);
  if (filters.status && filters.status !== "ALL")
    out = out.filter((d) => d.status === filters.status);
  if (filters.cloud && filters.cloud !== "ALL") {
    const key = {
      AWS: "awsS3Url",
      AZURE: "azureBlobUrl",
      GCP: "gcpStorageUrl",
      OCI: "ociObjectUrl",
    }[filters.cloud] as keyof DocumentDto["storageLocations"];
    out = out.filter((d) => Boolean(d.storageLocations[key]));
  }
  if (filters.search?.trim()) {
    const q = filters.search.toLowerCase();
    out = out.filter(
      (d) =>
        d.fileName.toLowerCase().includes(q) ||
        d.summary?.toLowerCase().includes(q) ||
        d.aiTags.some((t) => t.includes(q)),
    );
  }

  const dir = filters.direction === "asc" ? 1 : -1;
  out = [...out].sort((a, b) => {
    switch (filters.sort) {
      case "fileName":
        return a.fileName.localeCompare(b.fileName) * dir;
      case "fileSize":
        return (a.fileSizeBytes - b.fileSizeBytes) * dir;
      default:
        return (
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
          dir
        );
    }
  });

  const start = filters.page * filters.size;
  return {
    content: out.slice(start, start + filters.size),
    page: filters.page,
    size: filters.size,
    totalElements: out.length,
    totalPages: Math.max(1, Math.ceil(out.length / filters.size)),
  };
}

function toQuery(filters: DocumentFilters): string {
  const p = new URLSearchParams();
  p.set("page", String(filters.page));
  p.set("size", String(filters.size));
  p.set("sort", filters.sort);
  p.set("direction", filters.direction);
  if (filters.type && filters.type !== "ALL") p.set("type", filters.type);
  if (filters.status && filters.status !== "ALL")
    p.set("status", filters.status);
  if (filters.archived) p.set("archived", "true");
  if (filters.search?.trim()) p.set("q", filters.search.trim());
  return p.toString();
}

export const api = {
  listDocuments(filters: DocumentFilters) {
    return withFallback<Page<DocumentDto>>(
      `/documents?${toQuery(filters)}`,
      () => applyFilters(MOCK_DOCUMENTS, filters),
    );
  },

  getDocument(id: string) {
    return withFallback<DocumentDto>(`/documents/${id}`, () => {
      const found = MOCK_DOCUMENTS.find((d) => d.id === id);
      if (!found) throw new Error("DOCUMENT_NOT_FOUND");
      return found;
    });
  },

  getCloudHealth() {
    return withFallback<Record<CloudProvider, CloudStatus>>(
      "/health/clouds",
      () => MOCK_CLOUD_STATUS,
    );
  },

  getMe() {
    return withFallback<UserProfile>("/users/me", () => MOCK_USER);
  },

  async uploadDocument(file: File) {
    const form = new FormData();
    form.append("file", file);
    try {
      return await request<{
        documentId: string;
        status: string;
        websocketTopic: string;
      }>("/documents/upload", { method: "POST", body: form });
    } catch {
      setOffline(true);
      return {
        documentId: crypto.randomUUID(),
        status: "UPLOADING",
        websocketTopic: "",
      };
    }
  },

  /**
   * Streams the assistant reply token by token. Falls back to replaying the
   * demo answer at a typing cadence when the backend is unreachable.
   */
  async chatStream(
    message: string,
    conversationId: string | null,
    documentIds: string[],
    onToken: (chunk: string) => void,
  ): Promise<ChatMessageDto> {
    try {
      const res = await fetch(`${BASE_URL}/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId, documentIds }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      setOffline(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      let done = false;
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        if (chunk.value) {
          const piece = decoder.decode(chunk.value, { stream: true });
          text += piece;
          onToken(piece);
        }
      }
      return {
        id: crypto.randomUUID(),
        role: "assistant",
        content: text,
        createdAt: new Date().toISOString(),
      };
    } catch {
      setOffline(true);
      const reply = MOCK_CHAT_REPLY(message);
      const words = reply.content.split(" ");
      for (const word of words) {
        await new Promise((r) => setTimeout(r, 18));
        onToken(`${word} `);
      }
      return reply;
    }
  },
};
