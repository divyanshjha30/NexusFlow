import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import type { ProcessingEvent } from "@/types";

const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${location.host}/ws`;
const MAX_ATTEMPTS = 3;

/**
 * Subscribes to STOMP processing events. The backend WebSocket does not exist
 * until Milestone 5, so this gives up after a few attempts rather than retrying
 * forever and flooding the console.
 */
export function useProcessingSocket(onEvent: (event: ProcessingEvent) => void) {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    let attempts = 0;

    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 10_000,
      onStompError: () => void client.deactivate(),
      onWebSocketClose: () => {
        if (++attempts >= MAX_ATTEMPTS) void client.deactivate();
      },
      onWebSocketError: () => {},
      debug: () => {},
    });

    client.onConnect = () => {
      attempts = 0;
      client.subscribe("/topic/documents", (msg) => {
        try {
          handler.current(JSON.parse(msg.body) as ProcessingEvent);
        } catch {
          /* ignore malformed frames */
        }
      });
    };

    client.activate();

    return () => {
      void client.deactivate();
    };
  }, []);
}
