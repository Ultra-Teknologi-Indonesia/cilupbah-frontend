import { describe, expect, it } from "vitest";

import {
  formatShipmentLabel,
  guessShipmentTypeFromCourierName,
} from "./shipment-type";

describe("shipment type helpers", () => {
  it("classifies hyphenated next-day services as express", () => {
    expect(
      guessShipmentTypeFromCourierName("J&T Express Next-day delivery"),
    ).toBe("EXPRESS");
    expect(
      guessShipmentTypeFromCourierName("GoTo Logistics GTL Next-day delivery"),
    ).toBe("EXPRESS");
    expect(guessShipmentTypeFromCourierName("Nextday")).toBe("EXPRESS");
  });

  it("classifies marketplace instant courier names consistently", () => {
    expect(guessShipmentTypeFromCourierName("GoSend")).toBe("INSTANT");
    expect(guessShipmentTypeFromCourierName("GoJek Instant")).toBe("INSTANT");
    expect(guessShipmentTypeFromCourierName("SAME_DAY")).toBe("INSTANT");
  });

  it("uses the courier classification instead of a marketplace channel label", () => {
    expect(guessShipmentTypeFromCourierName("Gojek Instant")).toBe("INSTANT");
    expect(guessShipmentTypeFromCourierName("TIKTOK")).toBe("REGULAR");
  });

  it("uses the shipment number to distinguish dropdown options", () => {
    expect(
      formatShipmentLabel({
        shipmentNo: "JNT (25-08-2026)",
        shipmentType: "REGULAR",
        shipmentDate: "2026-08-26",
        hasInstant: false,
        courierCode: "jnt",
        courierName: "J&T",
      }),
    ).toBe("J&T 25-08-2026");
  });

  it("matches Jubelio labels for instant and Lazada shipments", () => {
    expect(
      formatShipmentLabel({
        shipmentNo: "INSTAN & SAMEDAY (25-08-2026)",
        shipmentType: "INSTANT",
        shipmentDate: "2026-08-26",
        hasInstant: true,
        courierCode: "spx",
        courierName: "SPX",
      }),
    ).toBe("INSTAN & SAMEDAY (25-08-2026)");

    expect(
      formatShipmentLabel({
        shipmentNo: "LAZADA (25-08-2026)",
        shipmentType: "REGULAR",
        shipmentDate: "2026-08-26",
        hasInstant: false,
        courierCode: "lex",
        courierName: "LEX",
      }),
    ).toBe("LAZADA (25-08-2026)");
  });
});
