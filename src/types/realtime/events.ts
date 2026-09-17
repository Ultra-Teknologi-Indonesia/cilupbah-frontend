export type RealtimeEventType =
  | "bulk-label.progress"
  | "export.progress"
  | "realtime.error";

export type RealtimeEvent = {
  id: string;
  type: RealtimeEventType | string;
  data: Record<string, unknown>;
};

export type RealtimeSubscriptionOptions = {
  bulkLabelBatchId?: string;
  exportId?: string;
  enabled?: boolean;
  /** Close this subscription once its resource reaches a terminal state. */
  closeOnTerminal?: boolean;
  onEvent: (event: RealtimeEvent) => void;
  onError?: (error: Error) => void;
};
