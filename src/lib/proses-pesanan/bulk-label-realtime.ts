import type { BulkLabelBatch, BulkLabelBatchStatus } from "@/types/proses-pesanan/bulk-label";

const TERMINAL_STATUSES = new Set<BulkLabelBatchStatus>(["ready", "failed"]);
const VALID_STATUSES = new Set<BulkLabelBatchStatus>([
  "processing",
  "ready",
  "failed",
]);

function numberOrCurrent(value: unknown, current: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : current;
}

/**
 * Applies a compact SSE progress event without re-fetching the full item list.
 * Consumers explicitly refetch detailed rows on coalesced progress events.
 */
export function applyBulkLabelProgress(
  current: BulkLabelBatch | undefined,
  event: Record<string, unknown>,
): BulkLabelBatch | undefined {
  if (!current || typeof event.status !== "string") return current;

  const status = VALID_STATUSES.has(event.status as BulkLabelBatchStatus)
    ? (event.status as BulkLabelBatchStatus)
    : current.status;

  return {
    ...current,
    status,
    total: numberOrCurrent(event.total, current.total),
    done: numberOrCurrent(event.done, current.done),
    failed: numberOrCurrent(event.failed, current.failed),
    skipped: numberOrCurrent(event.skipped, current.skipped ?? 0),
    finished_at:
      typeof event.finished_at === "string" || event.finished_at === null
        ? event.finished_at
        : current.finished_at,
  };
}

export function isTerminalBulkLabelProgress(
  event: Record<string, unknown>,
): boolean {
  return (
    typeof event.status === "string" &&
    TERMINAL_STATUSES.has(event.status as BulkLabelBatchStatus)
  );
}

export function canPrintReadyLabels(
  batch: Pick<BulkLabelBatch, "status" | "done" | "pdf_url"> | undefined,
  printing: boolean,
): boolean {
  if (!batch || printing || batch.done < 1) return false;
  return batch.status === "ready" ? !!batch.pdf_url : true;
}
