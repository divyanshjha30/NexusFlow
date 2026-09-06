import { create } from "zustand";
import { api } from "@/api/client";
import type { ChatMessageDto } from "@/types";

interface ChatStore {
  messages: ChatMessageDto[];
  conversationId: string | null;
  selectedDocumentIds: string[];
  sending: boolean;
  toggleDocument: (id: string) => void;
  clearSelection: () => void;
  reset: () => void;
  send: (message: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  conversationId: null,
  selectedDocumentIds: [],
  sending: false,

  toggleDocument: (id) =>
    set((s) => ({
      selectedDocumentIds: s.selectedDocumentIds.includes(id)
        ? s.selectedDocumentIds.filter((x) => x !== id)
        : [...s.selectedDocumentIds, id],
    })),

  clearSelection: () => set({ selectedDocumentIds: [] }),

  reset: () => set({ messages: [], conversationId: null }),

  async send(message) {
    if (!message.trim() || get().sending) return;

    const userMessage: ChatMessageDto = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };

    const streamingId = crypto.randomUUID();
    const placeholder: ChatMessageDto = {
      id: streamingId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      pending: true,
    };

    set((s) => ({
      messages: [...s.messages, userMessage, placeholder],
      sending: true,
    }));

    const appendToken = (chunk: string) =>
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === streamingId ? { ...m, content: m.content + chunk } : m,
        ),
      }));

    const final = await api.chatStream(
      message,
      get().conversationId,
      get().selectedDocumentIds,
      appendToken,
    );

    // Citations come from the same retrieval that grounded the answer.
    let sources: Awaited<ReturnType<typeof api.chatSources>> = [];
    try {
      sources = await api.chatSources(message, get().selectedDocumentIds);
    } catch {
      /* citations are best-effort */
    }

    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === streamingId
          ? {
              ...m,
              content: final.content,
              sources,
              pending: false,
            }
          : m,
      ),
      conversationId: s.conversationId ?? crypto.randomUUID(),
      sending: false,
    }));
  },
}));
