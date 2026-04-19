import { useEffect, useRef } from "react";

import { queryClient } from "@/lib/queryClient";

export function useClientEventStream(token: string | null) {
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let eventSource: EventSource | null = null;
    let closed = false;
    let attempts = 0;

    const connect = () => {
      if (closed) {
        return;
      }

      eventSource = new EventSource(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/api/client/events?token=${encodeURIComponent(token)}`
      );

      eventSource.onopen = () => {
        attempts = 0;
      };

      eventSource.onmessage = () => {
        void queryClient.invalidateQueries({ queryKey: ["client", "portfolio"] });
        void queryClient.invalidateQueries({ queryKey: ["client", "transaction-documents"] });
      };

      eventSource.onerror = () => {
        if (closed) {
          return;
        }

        eventSource?.close();
        attempts += 1;
        reconnectTimerRef.current = window.setTimeout(connect, Math.min(4_000, 1_000 * attempts));
      };
    };

    connect();

    return () => {
      closed = true;
      eventSource?.close();
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [token]);
}
