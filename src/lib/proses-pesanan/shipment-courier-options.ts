import type { Courier } from "@/types/proses-pesanan/fulfillment";

const SPX_CODE = "spx";
const SPX_INSTANT_OPTION_ID = "service:spx-instant";

/**
 * Adds service-level choices that share a persisted courier master.
 *
 * The courier master represents the carrier family (`SPX`), while a shipment
 * can still need the marketplace service label (`SPX Instant`). Keep this
 * option client-side so we do not create a duplicate courier master row.
 */
export function withShipmentServiceOptions(couriers: Courier[]): Courier[] {
  const hasSpx = couriers.some(
    (courier) => courier.code?.trim().toLowerCase() === SPX_CODE,
  );

  if (!hasSpx || couriers.some((courier) => courier.name === "SPX Instant")) {
    return couriers;
  }

  return [
    ...couriers,
    {
      id: SPX_INSTANT_OPTION_ID,
      name: "SPX Instant",
      code: SPX_CODE,
      logoUrl: null,
      isActive: true,
    },
  ];
}
