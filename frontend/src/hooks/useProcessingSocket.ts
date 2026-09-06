import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import type { ProcessingEvent } from "@/types";
import { freshToken } from "@/stores/authStore";

const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${location.host}/ws`;
const MAX_ATTEMPTS = 3;

/**
 * Subscribes to STOMP processing events, giving up after a few attempts rather
 * than retrying forever and flooding the console.
 */
export function useProcessingSocket(onEvent: (event: ProcessingEvent) => void) {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    let attempts = 0;

    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 10_000,
      // A browser cannot set handshake headers, so the token rides the CONNECT frame.
      beforeConnect: async () => {
        const token = await freshToken();
        client.connectHeaders = token
          ? { Authorization: `Bearer ${token}` }
          : {};
      },
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
