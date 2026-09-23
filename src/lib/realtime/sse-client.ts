import type {
  RealtimeEvent,
  RealtimeSubscriptionOptions,
} from "@/types/realtime/events";

const STREAM_PATH = "/api/app/realtime/stream";
const TERMINAL_STATUSES = new Set(["ready", "failed"]);

type Listener = {
  id: number;
  options: RealtimeSubscriptionOptions;
};

let nextListenerId = 1;
let source: EventSource | null = null;
let lastEventId: string | undefined;
let reconnectTimer: number | undefined;
let visibilityListenerRegistered = false;
const listeners = new Map<number, Listener>();

function buildStreamUrl(): string {
  const params = new URLSearchParams();
  const batchIds = new Set<string>();
  const exportIds = new Set<string>();

  for (const { options } of listeners.values()) {
    if (options.bulkLabelBatchId) batchIds.add(options.bulkLabelBatchId);
    if (options.exportId) exportIds.add(options.exportId);
  }

  for (const id of batchIds) params.append("bulk_label_batch_id[]", id);
  for (const id of exportIds) params.append("export_id[]", id);
  if (lastEventId) params.set("last_event_id", lastEventId);

  return `${STREAM_PATH}?${params.toString()}`;
}

function parseEvent(event: MessageEvent<string>): RealtimeEvent | null {
  try {
    const data = JSON.parse(event.data) as unknown;
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;

    return {
      id: event.lastEventId,
      type: event.type,
      data: data as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

function matches(listener: Listener, event: RealtimeEvent): boolean {
  if (event.type === "realtime.error") return true;
  if (event.type === "bulk-label.progress") {
    return listener.options.bulkLabelBatchId === event.data.batch_id;
  }
  if (event.type === "export.progress") {
    return listener.options.exportId === event.data.export_id;
  }
  return false;
}

function isTerminalEvent(event: RealtimeEvent): boolean {
  return (
    (event.type === "bulk-label.progress" || event.type === "export.progress") &&
    typeof event.data.status === "string" &&
    TERMINAL_STATUSES.has(event.data.status)
  );
}

function notify(event: RealtimeEvent): void {
  const terminalListenerIds: number[] = [];

  for (const listener of listeners.values()) {
    if (!matches(listener, event)) continue;

    listener.options.onEvent(event);
    if (listener.options.closeOnTerminal !== false && isTerminalEvent(event)) {
      terminalListenerIds.push(listener.id);
    }
  }

  if (terminalListenerIds.length === 0) return;

  for (const listenerId of terminalListenerIds) {
    listeners.delete(listenerId);
  }

  // The current EventSource URL may still contain a terminal resource. Let
  // connect() rebuild it from the remaining active listeners. If there are no
  // listeners, close immediately and cancel the browser's auto-reconnect.
  if (listeners.size === 0) {
    source?.close();
    source = null;
    if (reconnectTimer !== undefined) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
  } else {
    scheduleReconnect();
  }
}

function connect(): void {
  if (
    typeof window === "undefined" ||
    document.visibilityState !== "visible" ||
    listeners.size === 0
  ) {
    return;
  }

  source?.close();
  source = new EventSource(buildStreamUrl(), { withCredentials: true });

  const handleMessage = (event: Event) => {
    const parsed = parseEvent(event as MessageEvent<string>);
    if (!parsed) return;
    if (parsed.id) lastEventId = parsed.id;
    if (parsed.type !== "connected") notify(parsed);
  };

  source.addEventListener("connected", handleMessage);
  source.addEventListener("bulk-label.progress", handleMessage);
  source.addEventListener("export.progress", handleMessage);
  source.addEventListener("realtime.error", handleMessage);
  source.onopen = () => undefined;
  source.onerror = () => {
    // Native EventSource performs the reconnect with the server-provided
    // retry delay and the latest Redis Stream cursor. Do not start REST
    // polling here: it duplicates load precisely when realtime is degraded.
  };
}

function scheduleReconnect(): void {
  if (reconnectTimer !== undefined) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = undefined;
    connect();
  }, 0);
}

function ensureVisibilityListener(): void {
  if (visibilityListenerRegistered) return;
  visibilityListenerRegistered = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      source?.close();
      source = null;
      return;
    }
    scheduleReconnect();
  });
}

/**
 * Shares one authenticated stream across active bulk-label/export consumers.
 * The stream is closed while the document is hidden and reconnects from the
 * last received Redis Stream id when visible again.
 */
export function subscribeRealtime(
  options: RealtimeSubscriptionOptions,
): () => void {
  if (typeof window === "undefined" || options.enabled === false) {
    return () => undefined;
  }

  const id = nextListenerId++;
  listeners.set(id, { id, options });
  ensureVisibilityListener();
  scheduleReconnect();

  return () => {
    listeners.delete(id);
    if (listeners.size === 0) {
      source?.close();
      source = null;
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
    } else {
      // The target list may have changed; reopen once with the reduced set.
      scheduleReconnect();
    }
  };
}
