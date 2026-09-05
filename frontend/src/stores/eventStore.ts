import { create } from "zustand";
import type { CloudEvent } from "@/types";
import { MOCK_EVENTS } from "@/api/mockData";

interface EventStore {
  events: CloudEvent[];
  push: (event: CloudEvent) => void;
}

const MAX_EVENTS = 100;

export const useEventStore = create<EventStore>((set) => ({
  events: MOCK_EVENTS,
  push: (event) =>
    set((s) => ({ events: [event, ...s.events].slice(0, MAX_EVENTS) })),
}));
