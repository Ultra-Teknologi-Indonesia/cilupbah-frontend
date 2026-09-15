import type { BulkLabelBatchStatus } from "@/types/proses-pesanan/bulk-label";

export const BULK_LABEL_STATUS_POLL_INTERVAL_MS = 2_000;

export function bulkLabelRefetchInterval(
  status: BulkLabelBatchStatus | undefined,
): number | false {
  return status === "processing" ? BULK_LABEL_STATUS_POLL_INTERVAL_MS : false;
}
