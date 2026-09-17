import { describe, expect, it } from "vitest";

import type { Courier } from "@/types/proses-pesanan/fulfillment";
import { withShipmentServiceOptions } from "./shipment-courier-options";

const spx: Courier = {
  id: "courier-spx",
  name: "SPX",
  code: "spx",
  logoUrl: null,
  isActive: true,
};

describe("withShipmentServiceOptions", () => {
  it("adds SPX Instant while preserving the canonical SPX code", () => {
    const options = withShipmentServiceOptions([spx]);
    const instant = options.find((option) => option.name === "SPX Instant");

    expect(instant).toMatchObject({
      id: "service:spx-instant",
      name: "SPX Instant",
      code: "spx",
    });
  });

  it("does not add SPX Instant when SPX is not available", () => {
    const options = withShipmentServiceOptions([
      { ...spx, code: "jnt", name: "J&T" },
    ]);

    expect(options.map((option) => option.name)).toEqual(["J&T"]);
  });

  it("does not duplicate an existing SPX Instant option", () => {
    const existing = {
      ...spx,
      id: "courier-spx-instant",
      name: "SPX Instant",
    };

    expect(withShipmentServiceOptions([spx, existing])).toHaveLength(2);
  });
});
