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

  async send(message) {
    if (!message.trim() || get().sending) return;

    const userMessage: ChatMessageDto = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMessage], sending: true }));

    const reply = await api.chat(message, get().conversationId);
    set((s) => ({
      messages: [...s.messages, reply],
      conversationId: s.conversationId ?? crypto.randomUUID(),
      sending: false,
    }));
  },
}));
