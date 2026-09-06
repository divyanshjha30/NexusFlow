import type {
  ChatMessageDto,
  CloudProvider,
  CloudStatus,
  DocumentDto,
  DocumentEvent,
  DocumentFilters,
  Page,
  SearchHit,
  SourceRef,
  Stats,
  UserProfile,
} from "@/types";
import { freshToken, useAuthStore } from "@/stores/authStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
const TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await freshToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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
        ...(await authHeader()),
        ...init?.headers,
      },
    });

    if (res.status === 401) {
      useAuthStore.getState().logout();
      throw new ApiError(401, "UNAUTHENTICATED", "Your session has expired.");
    }

    if (!res.ok) {
      let code = `HTTP_${res.status}`;
      let message = res.statusText;
      try {
        const body = await res.json();
        code = body.error ?? code;
        message = body.message ?? message;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(res.status, code, message);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
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
    return request<Page<DocumentDto>>(`/documents?${toQuery(filters)}`);
  },

  getDocument(id: string) {
    return request<DocumentDto>(`/documents/${id}`);
  },

  deleteDocument(id: string) {
    return request<void>(`/documents/${id}`, { method: "DELETE" });
  },

  archiveDocument(id: string) {
    return request<void>(`/documents/${id}/archive`, { method: "POST" });
  },

  restoreDocument(id: string) {
    return request<void>(`/documents/${id}/restore`, { method: "POST" });
  },

  getCloudHealth() {
    return request<Record<CloudProvider, CloudStatus>>("/health/clouds");
  },

  getMe() {
    return request<UserProfile>("/users/me");
  },

  getStats() {
    return request<Stats>("/stats");
  },

  getTags() {
    return request<string[]>("/tags");
  },

  getDocumentEvents(id: string) {
    return request<DocumentEvent[]>(`/documents/${id}/events`);
  },

  getRecentEvents(limit = 50) {
    return request<DocumentEvent[]>(`/events?limit=${limit}`);
  },

  search(query: string, size = 20) {
    return request<{
      query: string;
      results: SearchHit[];
      totalResults: number;
      searchTimeMs: number;
      searchStrategy: string;
    }>("/search", {
      method: "POST",
      body: JSON.stringify({ query, size }),
    });
  },

  uploadDocument(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request<{
      documentId: string;
      status: string;
      websocketTopic: string;
    }>("/documents/upload", { method: "POST", body: form });
  },

  chatSources(message: string, documentIds: string[]) {
    return request<SourceRef[]>("/ai/chat/sources", {
      method: "POST",
      body: JSON.stringify({ message, conversationId: null, documentIds }),
    });
  },

  /** Streams the assistant reply, invoking onToken for each chunk. */
  async chatStream(
    message: string,
    conversationId: string | null,
    documentIds: string[],
    onToken: (chunk: string) => void,
  ): Promise<ChatMessageDto> {
    const res = await fetch(`${BASE_URL}/ai/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ message, conversationId, documentIds }),
    });

    if (!res.ok || !res.body) {
      throw new ApiError(
        res.status,
        "CHAT_FAILED",
        "The assistant is unavailable.",
      );
    }

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
  },
};
