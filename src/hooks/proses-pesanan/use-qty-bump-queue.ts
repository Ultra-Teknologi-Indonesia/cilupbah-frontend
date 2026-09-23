"use client";

import * as React from "react";

export interface QtyBumpQueueOptions {
  retries?: number;

  retryDelayMs?: number;

  onGiveUp?: (itemId: string) => void;
}

export function useQtyBumpQueue(
  commit: (
    itemId: string,
    absoluteQty: number,
    eventId?: string,
  ) => Promise<unknown>,
  options?: QtyBumpQueueOptions,
) {
  const commitRef = React.useRef(commit);
  React.useEffect(() => {
    commitRef.current = commit;
  });

  const optionsRef = React.useRef(options);
  React.useEffect(() => {
    optionsRef.current = options;
  });

  const targetRef = React.useRef<Map<string, number>>(new Map());
  const pendingRef = React.useRef<
    Map<string, Array<{ absoluteQty: number; eventId?: string }>>
  >(new Map());
  const inflightRef = React.useRef<Set<string>>(new Set());

  const flush = React.useCallback(async (itemId: string) => {
    if (inflightRef.current.has(itemId)) return;
    inflightRef.current.add(itemId);
    try {
      for (;;) {
        const pending = pendingRef.current.get(itemId);
        const event = pending?.[0];
        if (!pending || !event) break;

        const retries = optionsRef.current?.retries ?? 2;
        const retryDelayMs = optionsRef.current?.retryDelayMs ?? 600;
        let committed = false;

        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            await commitRef.current(itemId, event.absoluteQty, event.eventId);
            committed = true;
            break;
          } catch {
            if (attempt < retries) {
              await new Promise((r) =>
                setTimeout(r, retryDelayMs * (attempt + 1)),
              );
            }
          }
        }

        if (!committed) {
          targetRef.current.delete(itemId);
          pendingRef.current.delete(itemId);
          optionsRef.current?.onGiveUp?.(itemId);
          break;
        }

        pending.shift();
        if (pending.length === 0) {
          pendingRef.current.delete(itemId);
          targetRef.current.delete(itemId);
          break;
        }
      }
    } finally {
      inflightRef.current.delete(itemId);
    }
  }, []);

  const bump = React.useCallback(
    ({
      itemId,
      base,
      max,
      delta = 1,
      eventId,
    }: {
      itemId: string;
      base: number;
      max: number;
      delta?: number;
      eventId?: string;
    }): number | null => {
      const cur = targetRef.current.get(itemId) ?? base;
      const next = Math.max(0, Math.min(max, cur + delta));
      if (next === cur) return null;
      targetRef.current.set(itemId, next);
      const pending = pendingRef.current.get(itemId) ?? [];
      pending.push({ absoluteQty: next, eventId });
      pendingRef.current.set(itemId, pending);
      void flush(itemId);
      return next;
    },
    [flush],
  );

  const reset = React.useCallback(() => {
    targetRef.current.clear();
    pendingRef.current.clear();
    inflightRef.current.clear();
  }, []);

  return { bump, reset };
}
