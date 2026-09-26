"use client";

import * as React from "react";

export interface ScanDeltaQueueOptions {
  onGiveUp?: (itemId: string, lostQty: number, error: unknown) => void;
  onSuccess?: (res: unknown, itemId: string, qty: number) => void;
}

export function useScanDeltaQueue(
  commit: (itemId: string, deltaQty: number) => Promise<unknown>,
  options?: ScanDeltaQueueOptions,
) {
  const commitRef = React.useRef(commit);
  React.useEffect(() => {
    commitRef.current = commit;
  });

  const optionsRef = React.useRef(options);
  React.useEffect(() => {
    optionsRef.current = options;
  });

  const pendingRef = React.useRef<Map<string, number>>(new Map());
  const inflightRef = React.useRef<Set<string>>(new Set());

  const flush = React.useCallback(async (itemId: string) => {
    if (inflightRef.current.has(itemId)) return;
    inflightRef.current.add(itemId);
    try {
      for (;;) {
        const pending = pendingRef.current.get(itemId) ?? 0;
        if (pending <= 0) {
          pendingRef.current.delete(itemId);
          break;
        }

        pendingRef.current.set(itemId, 0);

        try {
          const res = await commitRef.current(itemId, pending);
          optionsRef.current?.onSuccess?.(res, itemId, pending);
        } catch (error) {
          pendingRef.current.delete(itemId);
          optionsRef.current?.onGiveUp?.(itemId, pending, error);
          break;
        }
      }
    } finally {
      inflightRef.current.delete(itemId);
    }
  }, []);

  const bump = React.useCallback(
    ({ itemId, delta = 1 }: { itemId: string; delta?: number }): void => {
      pendingRef.current.set(
        itemId,
        (pendingRef.current.get(itemId) ?? 0) + delta,
      );
      void flush(itemId);
    },
    [flush],
  );

  const reset = React.useCallback(() => {
    pendingRef.current.clear();
    inflightRef.current.clear();
  }, []);

  return { bump, reset };
}
