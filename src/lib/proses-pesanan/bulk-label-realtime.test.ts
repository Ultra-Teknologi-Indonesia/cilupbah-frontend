import { describe, expect, it } from "vitest";

import {
  applyBulkLabelProgress,
  isTerminalBulkLabelProgress,
} from "./bulk-label-realtime";

describe("bulk label realtime progress", () => {
  it("updates only the compact batch summary", () => {
    const result = applyBulkLabelProgress(
      {
        id: "batch-1",
        status: "processing",
        total: 10,
        done: 2,
        failed: 1,
        skipped: 0,
        waiting_shopee: 2,
        items: [],
        pdf_url: null,
        started_at: null,
        finished_at: null,
      },
      {
        status: "processing",
        total: 10,
        done: 5,
        failed: 1,
        skipped: 1,
      },
    );

    expect(result).toMatchObject({
      status: "processing",
      total: 10,
      done: 5,
      failed: 1,
      skipped: 1,
      waiting_shopee: 2,
    });
  });

  it("recognises terminal events", () => {
    expect(isTerminalBulkLabelProgress({ status: "ready" })).toBe(true);
    expect(isTerminalBulkLabelProgress({ status: "processing" })).toBe(false);
  });
});
