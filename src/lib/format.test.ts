import { describe, expect, it } from "vitest";

import { formatDateTimeWithSeconds, formatPickingDuration } from "@/lib/format";

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

describe("formatPickingDuration", () => {
  it("starts from the handover time even while the picklist is still draft", () => {
    expect(
      formatPickingDuration(
        "2026-09-17T08:00:00Z",
        null,
        "DRAFT",
        new Date("2026-09-17T08:30:00Z"),
      ),
    ).toBe("30m");
  });

  it("does not show a duration before the picklist is handed over", () => {
    expect(
      formatPickingDuration(null, null, "DRAFT", new Date("2026-09-17T08:30:00Z")),
    ).toBe("—");
  });
});
