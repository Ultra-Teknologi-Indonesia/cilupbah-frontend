"use client";

import * as React from "react";

import { subscribeRealtime } from "@/lib/realtime/sse-client";
import type {
  RealtimeEvent,
  RealtimeSubscriptionOptions,
} from "@/types/realtime/events";

type UseRealtimeEventsOptions = Omit<
  RealtimeSubscriptionOptions,
  "onEvent" | "onError"
> & {
  onEvent?: (event: RealtimeEvent) => void;
  onError?: (error: Error) => void;
};

export function useRealtimeEvents(options: UseRealtimeEventsOptions): void {
  const onEventRef = React.useRef(options.onEvent);
  const onErrorRef = React.useRef(options.onError);

  React.useEffect(() => {
    onEventRef.current = options.onEvent;
    onErrorRef.current = options.onError;
  }, [options.onEvent, options.onError]);

  React.useEffect(() => {
    return subscribeRealtime({
      bulkLabelBatchId: options.bulkLabelBatchId,
      exportId: options.exportId,
      enabled: options.enabled,
      closeOnTerminal: options.closeOnTerminal,
      onEvent: (event) => onEventRef.current?.(event),
      onError: (error) => onErrorRef.current?.(error),
    });
  }, [options.bulkLabelBatchId, options.exportId, options.enabled]);
}
