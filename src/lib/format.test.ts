import { describe, expect, it } from "vitest";

import { formatDateTimeWithSeconds } from "@/lib/format";

describe("formatDateTimeWithSeconds", () => {
  it("formats process timestamps in WIB with seconds and colon separators", () => {
    expect(formatDateTimeWithSeconds("2026-09-02T03:28:01Z")).toBe(
      "02 Sep 2026, 10:28:01",
    );
  });

  it("returns a dash for an empty or invalid timestamp", () => {
    expect(formatDateTimeWithSeconds(null)).toBe("—");
    expect(formatDateTimeWithSeconds("not-a-date")).toBe("—");
  });
});
