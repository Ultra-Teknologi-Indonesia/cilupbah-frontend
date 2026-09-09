import { fetchBlobPost, fetchBlobRaw, fetchClient } from "@/lib/api-client";
import { ExportJobService } from "@/services/laporan/export-job.service";
import type { ApiPaginated, ApiResponse } from "@/types/api.types";
import type {
  Courier,
  FulfillmentListParams,
  FulfillmentBoardCounts,
  FulfillmentOrder,
  Packlist,
  PacklistDetail,
  PacklistItem,
  Picker,
  Picklist,
  PicklistDetail,
  PicklistItem,
  RawCourier,
  RawFulfillmentOrder,
  RawPacklist,
  RawPacklistDetail,
  RawPacklistItem,
  RawPicker,
  RawPicklist,
  RawPicklistDetail,
  RawPicklistItem,
  RawReadyToShipResult,
  RawShipment,
  RawCompletedShipmentOrderRow,
  CompletedShipmentOrderRow,
  RawShipmentDetail,
  RawShipmentOrder,
  ReadyToShipResult,
  Shipment,
  ShipmentDetail,
  ShipmentOrderItem,
  ShipmentScanResult,
  ReconcileSummary,
  OutboundMonitoring,
  RawOutboundMonitoring,
} from "@/types/proses-pesanan/fulfillment";

export interface CreateShipmentPayload {
  shipment_no?: string | null;
  location_id?: string | null;
  courier_name?: string | null;
  courier_code?: string | null;
  shipment_type: string;
  shipment_date: string;
  notes?: string | null;
}

export type ProcessOrdersExportScope = {
  stage: "picking" | "packing" | "shipping";
  sub: string;
};

type Meta = ApiPaginated<unknown>["meta"];

export interface ListResult<T> {
  items: T[];
  meta: Meta;
}

const FALLBACK_META: Meta = {
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
};

type LegacyPaginator<T> = {
  data?: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
};

function buildQuery(
  params: FulfillmentListParams,
  extra?: Record<string, string>,
): string {
  const q = new URLSearchParams();
  if (params.q) q.set("search", params.q);
  if (params.location_id) q.set("filter[location_id]", params.location_id);
  if (params.source) q.set("filter[source]", params.source);
  if (params.status) q.set("filter[status]", params.status);

  if (params.shipping_provider)
    q.set("filter[shipping_provider]", params.shipping_provider);
  if (params.channel_shop_id)
    q.set("filter[channel_shop_id]", params.channel_shop_id);
  if (params.channel_status)
    q.set("filter[channel_status]", params.channel_status);
  if (params.payment) q.set("filter[payment]", params.payment);
  if (params.courier_type) q.set("filter[courier_type]", params.courier_type);
  if (params.awb) q.set("filter[awb]", params.awb);
  if (params.label_printed)
    q.set("filter[label_printed]", params.label_printed);
  if (params.date_from) q.set("filter[date_from]", params.date_from);
  if (params.date_to) q.set("filter[date_to]", params.date_to);
  if (params.exclude_transit)
    q.set("filter[exclude_transit]", params.exclude_transit);
  if (params.zone_id) q.set("filter[zone_id]", params.zone_id);
  if (params.courier_code) q.set("filter[courier_code]", params.courier_code);
  if (params.courier_name) q.set("filter[courier_name]", params.courier_name);
  if (params.shipment_type)
    q.set("filter[shipment_type]", params.shipment_type);
  if (params.sort_by) {
    const prefix = params.sort_dir === "desc" ? "-" : "";
    q.set("sort", prefix + params.sort_by);
  }
  q.set("per_page", String(params.per_page ?? 20));
  q.set("page", String(params.page ?? 1));
  if (extra) for (const [k, v] of Object.entries(extra)) q.set(k, v);
  return q.toString();
}

function mapOrder(raw: RawFulfillmentOrder): FulfillmentOrder {
  return {
    id: raw.id,
    salesorderNo: raw.salesorder_no,
    channelOrderNo: raw.channel_order_no ?? null,
    channelBuyerId: raw.channel_buyer_id ?? null,
    customerName:
      (raw.shipping_full_name && raw.shipping_full_name !== "****"
        ? raw.shipping_full_name
        : raw.customer_name) ?? null,
    source: raw.source ?? null,
    commercePlatform: raw.commerce_platform ?? null,
    channelShopId: raw.channel_shop_id ?? null,
    isManual: Boolean(raw.is_manual),
    shippingLabelSupported: Boolean(raw.shipping_label_supported),
    status: raw.status ?? null,
    isPaid: Boolean(raw.is_paid),
    transactionDate: raw.transaction_date ?? null,
    grandTotal: raw.grand_total ?? 0,
    actualShippingFee: raw.actual_shipping_fee ?? null,
    orderWeightGram: raw.order_weight_gram ?? null,
    locationId: raw.location_id ?? null,
    locationName: raw.location_name ?? raw.location?.location_name ?? null,
    trackingNumber: raw.tracking_number ?? null,
    shippingProvider: raw.shipping_provider ?? null,
    isCod: Boolean(raw.is_cod),
    priorityFulfillment: Boolean(raw.priority_fulfillment),
    isSplitOrder: Boolean(raw.is_split_order),
    channelStatus: raw.channel_status ?? null,
    cancelBy: raw.cancel_by ?? null,
    isCanceled: Boolean(raw.is_canceled),
    cancelRequestedAt: raw.cancel_requested_at ?? null,
    cancelReason: raw.cancel_reason ?? null,
    cancelAcceptedAt: raw.cancel_accepted_at ?? null,
    fulfillmentFlag: raw.fulfillment_flag ?? null,
    daysToShip: raw.days_to_ship ?? null,
    shipByDate: raw.ship_by_date ?? null,
    pickupDoneTime: raw.pickup_done_time ?? null,
    dropshipperName: raw.dropshipper_name ?? null,
    dropshipperPhone: raw.dropshipper_phone ?? null,
    totalQty: raw.total_qty ?? null,
    totalSku: raw.total_sku ?? null,
    isInstant: Boolean(raw.is_instant),
    shippingType: raw.shipping_type ?? null,
    driverCallStatus:
      (raw.driver_call_status as FulfillmentOrder["driverCallStatus"]) ?? null,
    driverCallMessage: raw.driver_call_message ?? null,
    driverCallAttemptedAt: raw.driver_call_attempted_at ?? null,
    pickerName: raw.picker_name ?? null,
    packerName: raw.packer_name ?? null,
    picklistId: raw.picklist_id ?? null,
    picklistNo: raw.picklist_no ?? null,
    invoiceId: raw.invoice_id ?? null,
    invoiceNo: raw.invoice_no ?? null,
    items: (raw.items ?? []).map((i) => ({
      id: i.id,
      sku: i.sku,
      description: i.description,
      qty: i.qty_in_base,
      imageUrl: i.image_url ?? null,
    })),
  };
}

function mapPicklist(raw: RawPicklist): Picklist {
  const status = (raw.status ?? "DRAFT") as Picklist["status"];
  return {
    id: raw.id,
    picklistNo: raw.picklist_no,
    locationId: raw.location_id ?? raw.location?.id ?? null,
    locationName: raw.location?.location_name ?? null,
    pickerId: raw.picker_id ?? raw.picker?.id ?? null,
    pickerName: raw.picker?.name ?? null,
    assignedBy: raw.assigned_by ?? null,
    assignedAt: raw.assigned_at ?? null,
    status,
    startedAt: raw.started_at ?? null,
    completedAt: raw.completed_at ?? null,
    updatedVersionAt: raw.updated_version_at ?? null,
    notes: raw.notes ?? null,
    itemsCount: raw.items_count ?? 0,
    qtyOrdered: raw.items_sum_qty_ordered ?? 0,
    qtyPicked: raw.items_sum_qty_picked ?? 0,
    hasInstant: Boolean(raw.has_instant),
  };
}

function mapPacklist(raw: RawPacklist): Packlist {
  return {
    id: raw.id,
    packlistNo: raw.packlist_no,
    locationId: raw.location_id ?? raw.location?.id ?? null,
    locationName: raw.location?.location_name ?? null,
    packerId: raw.packer_id ?? raw.packer?.id ?? null,
    packerName: raw.packer?.name ?? null,
    orderId: raw.order_id ?? raw.order?.id ?? null,
    orderNo: raw.order?.salesorder_no ?? null,
    customerName: raw.order?.customer_name ?? null,
    transactionDate: raw.order?.transaction_date ?? null,
    status: (raw.status ?? "DRAFT") as Packlist["status"],
    packageCount: raw.package_count ?? 1,
    isInstant: Boolean(raw.order?.is_instant),
    shippingProvider: raw.order?.shipping_provider ?? null,
    shippingType: raw.order?.shipping_type ?? null,
    source: raw.order?.source ?? null,
    trackingNumber: raw.order?.tracking_number ?? null,
  };
}

function mapShipment(raw: RawShipment): Shipment {
  return {
    id: raw.id,
    shipmentNo: raw.shipment_no,
    locationId: raw.location_id ?? raw.location?.id ?? null,
    locationName: raw.location?.location_name ?? null,
    courierCode: raw.courier_code ?? null,
    courierName: raw.courier_name ?? null,
    shipmentType: raw.shipment_type ?? null,
    shipmentDate: raw.shipment_date ?? null,
    status: (raw.status ?? "SCHEDULED") as Shipment["status"],
    handedOverAt: raw.handed_over_at ?? null,
    ordersCount: raw.orders_count ?? 0,
    totalWeightGram: Number(raw.total_weight_gram ?? 0),
    hasInstant: Boolean(raw.has_instant),
    createdAt: raw.created_at ?? null,
    driverName: raw.driver_name ?? null,
    driverPhone: raw.driver_phone ?? null,
    driverVehiclePlate: raw.driver_vehicle_plate ?? null,
    driverBookingCode: raw.driver_booking_code ?? null,
    driverCallMethod:
      (raw.driver_call_method as Shipment["driverCallMethod"]) ?? null,
    driverCallStatus:
      (raw.driver_call_status as Shipment["driverCallStatus"]) ?? null,
    driverCalledAt: raw.driver_called_at ?? null,
    driverCalledBy: raw.driver_called_by ?? null,
    driverIdCardUrl: raw.driver_id_card_url ?? null,
    shipperId:
      raw.shipper_id != null
        ? String(raw.shipper_id)
        : raw.shipper?.id != null
          ? String(raw.shipper.id)
          : null,
    shipperName: raw.shipper?.name ?? raw.shipper?.email ?? null,
  };
}

function mapCompletedShipmentOrderRow(
  raw: RawCompletedShipmentOrderRow,
): CompletedShipmentOrderRow {
  return {
    orderId: raw.order_id ?? null,
    salesorderNo: raw.salesorder_no ?? null,
    customerName: raw.customer_name ?? null,
    trackingNumber: raw.tracking_number ?? null,
    source: raw.source ?? null,
    channelStatus: raw.channel_status ?? null,
    channelOrderNo: raw.channel_order_no ?? null,
    transactionDate: raw.transaction_date ?? null,
    shippingProvider: raw.shipping_provider ?? null,
    courierName: raw.courier_name ?? null,
    shippingAddress: raw.shipping_address ?? null,
    shippingCity: raw.shipping_city ?? null,
    shippingProvince: raw.shipping_province ?? null,
    shipmentId: raw.shipment_id ?? null,
    shipmentNo: raw.shipment_no ?? null,
    shipmentType: raw.shipment_type ?? null,
    shipmentStatus: raw.shipment_status,
    shipmentDate: raw.shipment_date ?? null,
    handedOverAt: raw.handed_over_at ?? null,
    locationName: raw.location_name ?? null,
    picklistNo: raw.picklist_no ?? null,
    qtyGiven: raw.qty_given ?? null,
    pickupCode: raw.pickup_code ?? null,
  };
}

function mapShipmentOrderItem(raw: RawShipmentOrder): ShipmentOrderItem {
  const o = raw.order;
  return {
    id: raw.id,
    orderId: raw.order_id,
    orderNo: o?.salesorder_no ?? null,
    transactionDate: o?.transaction_date ?? null,
    customerName: o?.customer_name ?? null,
    trackingNumber: raw.tracking_number ?? o?.tracking_number ?? null,
    shippingProvider: o?.shipping_provider ?? null,
    source: o?.source ?? null,
    grandTotal: Number(o?.grand_total ?? 0),
    weightGram: Number(o?.order_weight_gram ?? 0),
    status: o?.status ?? null,
    packlistNo: raw.packlist?.packlist_no ?? null,
    pickupStatus: raw.pickup_status ?? null,
    pickupMessage: raw.pickup_message ?? null,
    channelStatus: raw.order?.channel_status ?? null,
    scannedAt: raw.scanned_at ?? null,
  };
}

function mapShipmentDetail(raw: RawShipmentDetail): ShipmentDetail {
  return {
    ...mapShipment(raw),
    ordersCount: raw.orders?.length ?? raw.orders_count ?? 0,
    orders: (raw.orders ?? []).map(mapShipmentOrderItem),
    notes: raw.notes ?? null,
    createdBy: raw.created_by ?? null,
  };
}

function mapCourier(raw: RawCourier): Courier {
  return {
    id: raw.id,
    name: raw.name ?? raw.code ?? raw.id,
    code: raw.code ?? null,
    logoUrl: raw.logo_url ?? null,
    isActive: raw.is_active ?? true,
  };
}

function mapPicker(raw: RawPicker): Picker {
  return {
    id: raw.id,
    name: raw.name ?? raw.email ?? raw.id,
    email: raw.email ?? null,
  };
}

function pickMediaUrl(
  media?:
    | {
        url?: string | null;
        is_primary?: boolean | null;
        sort_order?: number | null;
      }[]
    | null,
): string | null {
  if (!media || media.length === 0) return null;
  const primary = media.find((m) => m?.is_primary);
  if (primary?.url) return primary.url;

  const sorted = [...media].sort(
    (a, b) => (a?.sort_order ?? 999) - (b?.sort_order ?? 999),
  );
  return sorted[0]?.url ?? media[0]?.url ?? null;
}

const PICKLIST_ITEM_STATUS_VALUES = new Set<PicklistItem["itemStatus"]>([
  "PENDING",
  "PARTIAL",
  "COMPLETED",
  "SHORT",
  "REJECTED",
  "PROCESSED_EXTERNALLY",
]);

const PICKLIST_FAIL_REASON_VALUES = new Set<PicklistItem["failReasonCode"]>([
  "STOCK_EMPTY",
  "DAMAGED",
  "REJECTED",
  "MISSING",
  "OTHER",
]);

function normalizeItemStatus(v: unknown): PicklistItem["itemStatus"] {
  if (typeof v !== "string" || !v) return null;
  const up = v.toUpperCase() as PicklistItem["itemStatus"];
  return PICKLIST_ITEM_STATUS_VALUES.has(up) ? up : null;
}

function normalizeFailReason(v: unknown): PicklistItem["failReasonCode"] {
  if (typeof v !== "string" || !v) return null;
  const up = v.toUpperCase() as PicklistItem["failReasonCode"];
  return PICKLIST_FAIL_REASON_VALUES.has(up) ? up : null;
}

function mapPicklistItem(raw: RawPicklistItem): PicklistItem {
  const imageUrl =
    raw.image_url ??
    pickMediaUrl(raw.product?.media) ??
    pickMediaUrl(raw.product?.product?.media) ??
    raw.product?.image_url ??
    raw.product?.product?.image_url ??
    raw.orderItem?.image_url ??
    null;

  return {
    id: raw.id,
    sku: raw.sku,
    name: raw.product?.product?.name ?? raw.orderItem?.description ?? null,
    variantName:
      raw.product?.variant_name ?? raw.orderItem?.variant_name ?? null,
    imageUrl,

    binCode:
      (raw.qty_picked ?? 0) > 0
        ? (raw.bin?.bin_final_code ?? raw.bin?.bin_code ?? null)
        : null,
    orderId: raw.order_id ?? null,
    orderNo: raw.order?.salesorder_no ?? null,
    source: raw.order?.source ?? null,
    trackingNumber: raw.order?.tracking_number ?? null,
    packageNo:
      raw.order?.shipment_orders?.[0]?.shipment?.shipment_no ??
      raw.order?.package_no ??
      raw.order?.shipment_no ??
      null,
    itemStatus: normalizeItemStatus(raw.item_status ?? raw.status),
    failReasonCode: normalizeFailReason(raw.fail_reason_code),
    failReasonNote: raw.fail_reason_note ?? null,
    failedQty: raw.failed_qty ?? null,
    qtyOrdered: raw.qty_ordered ?? 0,
    qtyPicked: raw.qty_picked ?? 0,
    lastPickedByName: raw.last_picked_by_name ?? null,
    lastPickedAt: raw.last_picked_at ?? null,
  };
}

function mapPicklistDetail(raw: RawPicklistDetail): PicklistDetail {
  return { ...mapPicklist(raw), items: (raw.items ?? []).map(mapPicklistItem) };
}

function resolveMediaUrl(
  media?: Array<{ url?: string | null; is_primary?: boolean | null }> | null,
): string | null {
  if (!media || media.length === 0) return null;
  const primary = media.find((m) => m.is_primary);
  return primary?.url ?? media[0]?.url ?? null;
}

function mapPacklistItem(raw: RawPacklistItem): PacklistItem {
  const variant = raw.order_item?.product ?? raw.product;
  const imageUrl =
    resolveMediaUrl(variant?.media) ??
    resolveMediaUrl(variant?.product?.media) ??
    raw.order_item?.image_url ??
    null;

  return {
    id: raw.id,
    sku: raw.sku,
    description: raw.order_item?.description ?? variant?.product?.name ?? null,
    imageUrl,
    qtyOrdered: raw.qty_ordered ?? 0,
    qtyPacked: raw.qty_packed ?? 0,
    barcodeVerified: Boolean(raw.barcode_verified),
  };
}

function mapPacklistDetail(raw: RawPacklistDetail): PacklistDetail {
  return { ...mapPacklist(raw), items: (raw.items ?? []).map(mapPacklistItem) };
}

function mapShipResult(raw: RawReadyToShipResult): ReadyToShipResult {
  return {
    orderId: raw.order_id,
    salesorderNo: raw.salesorder_no ?? null,
    source: raw.source ?? null,
    status: raw.status ?? "failed",
    message: raw.message ?? null,
  };
}

export const OutboundService = {
  ordersByStage: async (
    stage: string,
    params: FulfillmentListParams,
  ): Promise<ListResult<FulfillmentOrder>> => {
    const res = await fetchClient<
      ApiPaginated<RawFulfillmentOrder> | ApiResponse<LegacyPaginator<RawFulfillmentOrder>>
    >(
      `/outbound/orders/${stage}?${buildQuery(params)}`,
    );
    const payload = res.data;
    const items = Array.isArray(payload) ? payload : payload?.data ?? [];
    const legacyMeta = Array.isArray(payload)
      ? null
      : {
          current_page: payload?.current_page ?? 1,
          last_page: payload?.last_page ?? 1,
          per_page: payload?.per_page ?? 20,
          // Jangan memakai items.length sebagai total, karena items hanya isi
          // halaman aktif dan dapat membuat badge terlihat lebih kecil.
          total: payload?.total ?? 0,
        };

    return {
      items: items.map(mapOrder),
      meta: ("meta" in res ? res.meta : null) ?? legacyMeta ?? FALLBACK_META,
    };
  },

  counts: async (): Promise<FulfillmentBoardCounts> => {
    const res = await fetchClient<ApiResponse<FulfillmentBoardCounts>>(
      "/outbound/orders/counts",
    );
    return res.data;
  },

  monitoring: async (): Promise<OutboundMonitoring> => {
    const res = await fetchClient<ApiResponse<RawOutboundMonitoring>>(
      `/outbound/orders/monitoring`,
    );
    const raw = res.data;
    const s = raw?.summary;
    const periods = (raw?.periods ?? []).map((p) => ({
      dayTerm: p.day_term,
      readyToProcess: p.ready_to_process,
      pick: p.pick,
      pending: p.pending,
      pack: p.pack,
      readyToShip: p.ready_to_ship,
      waitingShip: p.waiting_ship,
    }));

    const readyToProcess =
      s?.ready_to_process ??
      s?.ready_to_process_today ??
      periods.find((period) => period.dayTerm === 0)?.readyToProcess ??
      0;
    const pendingFromTwoDaysAgo =
      s?.pending_from_two_days_ago ??
      periods.find((period) => period.dayTerm === 2)?.readyToProcess ??
      0;

    return {
      summary: {
        today: s?.today ?? 0,
        yest: s?.yest ?? 0,
        mtd: s?.mtd ?? 0,
        prevMonth: s?.prev_month ?? 0,
        readyToProcess,
        pendingFromTwoDaysAgo,
        pickedToday: s?.picked_today ?? 0,
        pickedYest: s?.picked_yest ?? 0,
      },
      periods,
    };
  },

  exportProcessOrdersCsv: async (
    scope: ProcessOrdersExportScope,
  ): Promise<string> => {
    const res = await fetchClient<ApiResponse<{ export_id: string }>>(
      "/outbound/orders/export/async",
      { method: "POST", data: scope },
    );

    return res.data.export_id;
  },

  picklists: async (
    params: FulfillmentListParams,
  ): Promise<ListResult<Picklist>> => {
    const res = await fetchClient<ApiPaginated<RawPicklist>>(
      `/outbound/picklists?${buildQuery(params)}`,
    );
    return {
      items: (res.data ?? []).map(mapPicklist),
      meta: res.meta ?? FALLBACK_META,
    };
  },

  packlists: async (
    params: FulfillmentListParams,
  ): Promise<ListResult<Packlist>> => {
    const res = await fetchClient<ApiPaginated<RawPacklist>>(
      `/outbound/packlists?${buildQuery(params)}`,
    );
    return {
      items: (res.data ?? []).map(mapPacklist),
      meta: res.meta ?? FALLBACK_META,
    };
  },

  shipments: async (
    params: FulfillmentListParams,
  ): Promise<ListResult<Shipment>> => {
    const res = await fetchClient<ApiPaginated<RawShipment>>(
      `/outbound/shipments?${buildQuery(params)}`,
    );
    return {
      items: (res.data ?? []).map(mapShipment),
      meta: res.meta ?? FALLBACK_META,
    };
  },

  completedShipments: async (
    params: FulfillmentListParams & {
      type?: string;
      courier_codes?: string[];
    },
  ): Promise<ListResult<CompletedShipmentOrderRow>> => {
    const type = encodeURIComponent(params.type ?? "all");
    const couriers = (params.courier_codes ?? []).join(",") || "all";
    const res = await fetchClient<ApiPaginated<RawCompletedShipmentOrderRow>>(
      `/outbound/shipments/completed/${type}/${encodeURIComponent(couriers)}?${buildQuery(params)}`,
    );
    return {
      items: (res.data ?? []).map(mapCompletedShipmentOrderRow),
      meta: res.meta ?? FALLBACK_META,
    };
  },

  courierOptionsByStage: async (stage: string): Promise<string[]> => {
    const res = await fetchClient<{ success?: boolean; data: string[] }>(
      `/outbound/orders/${stage}/courier-options`,
    );
    return res.data ?? [];
  },

  couriersAll: async (): Promise<Courier[]> => {
    const res = await fetchClient<{ success?: boolean; data: RawCourier[] }>(
      `/outbound/couriers/all`,
    );
    return (res.data ?? []).map(mapCourier);
  },

  pickers: async (locationId?: string, role?: string): Promise<Picker[]> => {
    const params = new URLSearchParams();
    if (locationId) params.set("location_id", locationId);
    if (role) params.set("role", role);
    const q = params.toString() ? `?${params}` : "";
    const res = await fetchClient<{ data: RawPicker[] }>(
      `/outbound/pickers${q}`,
    );
    return (res.data ?? []).map(mapPicker);
  },

  createPicklist: async (payload: {
    order_ids: string[];
    location_id: string;
    picker_id: string;
    notes?: string | null;
  }): Promise<Picklist> => {
    const res = await fetchClient<{ data: RawPicklist }>(
      `/outbound/picklists`,
      {
        method: "POST",
        data: payload,
      },
    );
    return mapPicklist(res.data);
  },

  assignPicker: async (
    picklistId: string,
    pickerId: string,
  ): Promise<Picklist> => {
    const res = await fetchClient<{ data: RawPicklist }>(
      `/outbound/picklists/${picklistId}/assign-picker`,
      { method: "POST", data: { picker_id: pickerId } },
    );
    return mapPicklist(res.data);
  },

  picklistDetail: async (id: string): Promise<PicklistDetail> => {
    const res = await fetchClient<{ data: RawPicklistDetail }>(
      `/outbound/picklists/${id}`,
    );
    return mapPicklistDetail(res.data);
  },
  picklistItems: async (
    id: string,
    params: FulfillmentListParams,
  ): Promise<ApiPaginated<PicklistItem>> => {
    const q = new URLSearchParams();
    if (params.sort_by) {
      const prefix = params.sort_dir === "desc" ? "-" : "";
      q.set("sort", prefix + params.sort_by);
    }
    q.set("per_page", String(params.per_page ?? 1000));
    q.set("page", String(params.page ?? 1));

    const res = await fetchClient<ApiPaginated<RawPicklistItem>>(
      `/outbound/picklists/${id}/items?${q.toString()}`,
    );
    return {
      status: res.status,
      message: res.message,
      data: (res.data ?? []).map(mapPicklistItem),
      meta: res.meta ?? {
        total: 0,
        current_page: 1,
        last_page: 1,
        per_page: 1000,
      },
    };
  },
  startPicklist: async (id: string): Promise<void> => {
    await fetchClient(`/outbound/picklists/${id}/start`, { method: "POST" });
  },

  pickItem: async (
    picklistId: string,
    itemId: string,
    payload:
      | { qty_delta: number; bin_code: string }
      | { qty_picked: number; bin_code: string },
  ): Promise<void> => {
    await fetchClient(
      `/outbound/picklists/${picklistId}/items/${itemId}/pick`,
      {
        method: "POST",
        data: payload,
      },
    );
  },
  unpickItem: async (
    picklistId: string,
    itemId: string,
    qty?: number,
  ): Promise<void> => {
    await fetchClient(
      `/outbound/picklists/${picklistId}/items/${itemId}/pick`,
      {
        method: "DELETE",
        data: qty != null ? { qty } : undefined,
      },
    );
  },
  failPickItem: async (
    picklistId: string,
    itemId: string,
    payload: { reasonCode: string; reasonNote?: string | null },
  ): Promise<PicklistDetail> => {
    const res = await fetchClient<{ data: RawPicklistDetail }>(
      `/outbound/picklists/${picklistId}/items/${itemId}/fail`,
      {
        method: "POST",
        data: {
          reason_code: payload.reasonCode,
          reason_note: payload.reasonNote ?? null,
        },
      },
    );
    return mapPicklistDetail(res.data);
  },
  unfailPickItem: async (
    picklistId: string,
    itemId: string,
  ): Promise<PicklistDetail> => {
    const res = await fetchClient<{ data: RawPicklistDetail }>(
      `/outbound/picklists/${picklistId}/items/${itemId}/unfail`,
      { method: "POST", data: {} },
    );
    return mapPicklistDetail(res.data);
  },

  scanForPick: async (
    picklistId: string,
    payload: {
      sku: string;
      bin_code?: string | null;
      hint_active_bin_code?: string | null;
    },
  ): Promise<{
    item_id: string;
    sku: string;
    bin_code: string;
    available_in_bin: number;
    remaining_to_pick: number;
    max_pickable: number;
    bin_source: "auto" | "manual" | "hint";
    candidates: Array<{ bin_id: string; bin_code: string; on_hand: number }>;
  }> => {
    const res = await fetchClient<{
      data: {
        item_id: string;
        sku: string;
        bin_code: string;
        available_in_bin: number;
        remaining_to_pick: number;
        max_pickable: number;
        bin_source: "auto" | "manual" | "hint";
        candidates: Array<{
          bin_id: string;
          bin_code: string;
          on_hand: number;
        }>;
      };
    }>(`/outbound/picklists/${picklistId}/scan`, {
      method: "POST",
      data: payload,
    });
    return res.data;
  },
  completePicklist: async (id: string): Promise<void> => {
    await fetchClient(`/outbound/picklists/${id}/complete`, { method: "POST" });
  },
  failPicklist: async (id: string, reason?: string): Promise<void> => {
    await fetchClient(`/outbound/picklists/${id}/fail`, {
      method: "POST",
      data: { reason: reason ?? null },
    });
  },
  revertPicklist: async (id: string): Promise<void> => {
    await fetchClient(`/outbound/picklists/${id}/revert`, { method: "POST" });
  },

  getOrderByNo: async (
    orderNo: string,
  ): Promise<RawFulfillmentOrder | null> => {
    try {
      const res = await fetchClient<{ data: RawFulfillmentOrder }>(
        `/outbound/orders/get-by-no`,
        {
          method: "POST",
          data: { order_no: orderNo },
        },
      );
      return res.data ?? null;
    } catch {
      return null;
    }
  },
  adHocPick: async (payload: {
    order_id: string;
    items?: Array<{
      order_item_id: string;
      qty_picked: number;
      bin_id?: string | null;
    }>;
  }): Promise<unknown> => {
    const res = await fetchClient<{ data: unknown }>(
      `/outbound/orders/ad-hoc-pick`,
      {
        method: "POST",
        data: payload,
      },
    );
    return res.data;
  },
  adHocPickScan: async (payload: {
    order_id: string;
    sku: string;
    qty?: number;
    bin_id?: string | null;
  }): Promise<{
    completed: boolean;
    matched_item_id: string;
    qty_picked: number;
    qty_ordered: number;
    progress: Record<string, number>;
    order: unknown;
  }> => {
    const res = await fetchClient<{
      data: {
        completed: boolean;
        matched_item_id: string;
        qty_picked: number;
        qty_ordered: number;
        progress: Record<string, number>;
        order: unknown;
      };
    }>(`/outbound/orders/ad-hoc-pick/scan`, {
      method: "POST",
      data: payload,
    });
    return res.data;
  },

  scanOrder: async (
    orderNo: string,
    packerId?: string | null,
  ): Promise<PacklistDetail> => {
    const params = new URLSearchParams({ order_no: orderNo });
    if (packerId) params.set("packer_id", packerId);
    const res = await fetchClient<{ data: RawPacklistDetail }>(
      `/outbound/packlists/scan-order?${params}`,
    );
    return mapPacklistDetail(res.data);
  },

  packlistDetail: async (id: string): Promise<PacklistDetail> => {
    const res = await fetchClient<{ data: RawPacklistDetail }>(
      `/outbound/packlists/${id}`,
    );
    return mapPacklistDetail(res.data);
  },
  startPacklist: async (id: string): Promise<void> => {
    await fetchClient(`/outbound/packlists/${id}/start`, { method: "POST" });
  },
  verifyBarcode: async (
    packlistId: string,
    barcode: string,
  ): Promise<{ itemId: string; sku: string } | null> => {
    const res = await fetchClient<{
      data?: { item_id?: string; sku?: string };
    }>(`/outbound/packlists/${packlistId}/verify-barcode`, {
      method: "POST",
      data: { barcode },
    });
    return res.data?.item_id
      ? { itemId: res.data.item_id, sku: res.data.sku ?? barcode }
      : null;
  },
  packItem: async (
    packlistId: string,
    itemId: string,
    payload: { qty_packed: number; barcode_verified?: boolean },
  ): Promise<void> => {
    await fetchClient(
      `/outbound/packlists/${packlistId}/items/${itemId}/pack`,
      {
        method: "POST",
        data: payload,
      },
    );
  },
  unpackItem: async (
    packlistId: string,
    itemId: string,
    qty?: number,
  ): Promise<void> => {
    await fetchClient(
      `/outbound/packlists/${packlistId}/items/${itemId}/pack`,
      {
        method: "DELETE",
        data: qty != null ? { qty } : undefined,
      },
    );
  },
  completePacklist: async (id: string): Promise<void> => {
    await fetchClient(`/outbound/packlists/${id}/complete`, { method: "POST" });
  },

  assignPacker: async (
    packlistId: string,
    packerId: string,
  ): Promise<Packlist> => {
    const res = await fetchClient<{ data: RawPacklist }>(
      `/outbound/packlists/${packlistId}/assign-packer`,
      { method: "POST", data: { packer_id: packerId } },
    );
    return mapPacklist(res.data);
  },

  createShipmentWithOrders: async (
    payload: CreateShipmentPayload,
    orderIds: string[],
    options?: { internalOnly?: boolean },
  ): Promise<Shipment> => {
    const created = await fetchClient<{ data: RawShipment }>(
      `/outbound/shipments`,
      {
        method: "POST",
        data: payload,
      },
    );
    const shipment = mapShipment(created.data);
    if (orderIds.length) {
      await fetchClient<{ data: RawShipment }>(
        `/outbound/shipments/${shipment.id}/add-orders`,
        {
          method: "POST",
          data: {
            order_ids: orderIds,
            ...(options?.internalOnly ? { internal_only: true } : {}),
          },
        },
      );
    }
    return shipment;
  },

  handOverShipment: async (shipmentId: string): Promise<Shipment> => {
    const res = await fetchClient<{ data: RawShipment }>(
      `/outbound/shipments/${shipmentId}/hand-over`,
      { method: "POST" },
    );
    return mapShipment(res.data);
  },

  cancelShipment: async (shipmentId: string): Promise<Shipment> => {
    const res = await fetchClient<{ data: RawShipment }>(
      `/outbound/shipments/${shipmentId}/cancel`,
      { method: "POST" },
    );
    return mapShipment(res.data);
  },

  manifestDoc: async (shipmentId: string): Promise<unknown> => {
    const res = await fetchClient<ApiResponse<unknown>>(
      `/reports/wms/shipping-manifest?id=${encodeURIComponent(shipmentId)}`,
    );
    return res.data;
  },

  markComplete: async (orderIds: string[]): Promise<number> => {
    const res = await fetchClient<{ data?: { completed?: number } }>(
      `/sales/orders/mark-as-complete`,
      { method: "POST", data: { order_ids: orderIds } },
    );
    return res.data?.completed ?? 0;
  },

  readyToShip: async (orderIds: string[]): Promise<ReadyToShipResult[]> => {
    const res = await fetchClient<{ data: RawReadyToShipResult[] }>(
      `/outbound/orders/ready-to-ship`,
      { method: "POST", data: { order_ids: orderIds } },
    );
    return (res.data ?? []).map(mapShipResult);
  },

  marketplaceLabel: async (
    orderId: string,
    opts?: { document_type?: string; document_size?: string },
  ): Promise<{
    type: string;
    url?: string;
    document_base64?: string;
    content_type?: string;
    source?: string;
  }> => {
    const sp = new URLSearchParams();
    if (opts?.document_type) sp.set("document_type", opts.document_type);
    if (opts?.document_size) sp.set("document_size", opts.document_size);
    const qs = sp.toString();
    const res = await fetchClient<
      ApiResponse<{
        type: string;
        url?: string;
        document_base64?: string;
        content_type?: string;
        source?: string;
      }>
    >(`/sales/${orderId}/shipping-label${qs ? `?${qs}` : ""}`);
    return res.data;
  },

  retryMarketplaceLabel: async (orderId: string): Promise<void> => {
    await fetchClient(`/sales/${orderId}/shipping-label/retry`, {
      method: "POST",
    });
  },

  printWithDriverCall: async (
    orderId: string,
    opts?: {
      document_type?: string;
      document_size?: string;
      force_label?: boolean;
    },
  ): Promise<{
    driver_call_status: "pending" | "success" | "failed";
    driver_call_message: string | null;
    driver_call_attempted_at: string | null;
    label: {
      type: string;
      url?: string;
      document_base64?: string;
      content_type?: string;
      source?: string;
    } | null;
    label_preparing?: boolean;
    label_error?: string;
  }> => {
    const sp = new URLSearchParams();
    if (opts?.document_type) sp.set("document_type", opts.document_type);
    if (opts?.document_size) sp.set("document_size", opts.document_size);
    if (opts?.force_label) sp.set("force_label", "1");
    const qs = sp.toString();

    const res = await fetchClient<
      ApiResponse<{
        driver_call_status: "pending" | "success" | "failed";
        driver_call_message: string | null;
        driver_call_attempted_at: string | null;
        label: {
          type: string;
          url?: string;
          document_base64?: string;
          content_type?: string;
          source?: string;
        } | null;
        label_preparing?: boolean;
        label_error?: string;
      }>
    >(`/sales/${orderId}/print-with-driver-call${qs ? `?${qs}` : ""}`, {
      method: "POST",
    });

    return res.data;
  },

  retryDriverCall: async (orderId: string): Promise<void> => {
    await fetchClient(`/sales/${orderId}/driver-call/retry`, {
      method: "POST",
    });
  },

  shipmentTrackingEvents: async (
    shipmentId: string,
  ): Promise<
    Array<{
      id: number | string;
      shipment_id: string;
      source: string;
      event_type: string;
      driver_name: string | null;
      driver_phone: string | null;
      driver_vehicle_plate: string | null;
      occurred_at: string;
      received_at: string;
    }>
  > => {
    const res = await fetchClient<
      ApiResponse<
        Array<{
          id: number | string;
          shipment_id: string;
          source: string;
          event_type: string;
          driver_name: string | null;
          driver_phone: string | null;
          driver_vehicle_plate: string | null;
          occurred_at: string;
          received_at: string;
        }>
      >
    >(`/outbound/shipments/${encodeURIComponent(shipmentId)}/tracking-events`);
    return res.data ?? [];
  },

  refreshShipmentTracking: async (shipmentId: string): Promise<void> => {
    await fetchClient(
      `/outbound/shipments/${encodeURIComponent(shipmentId)}/refresh-tracking`,
      { method: "POST" },
    );
  },

  callInstantDriverBulk: async (payload: {
    shipper_id: string | number;
    order_ids?: string[];
    shipment_ids?: string[];
  }): Promise<{
    summary: {
      success: number;
      failed: Array<{
        order_id: string;
        status: string;
        reason: string | null;
      }>;
    };
    results: Array<{
      order_id: string;
      status: string;
      message?: string | null;
      tracking_number?: string | null;
    }>;
  }> => {
    const res = await fetchClient<
      ApiResponse<{
        summary: {
          success: number;
          failed: Array<{
            order_id: string;
            status: string;
            reason: string | null;
          }>;
        };
        results: Array<{
          order_id: string;
          status: string;
          message?: string | null;
          tracking_number?: string | null;
        }>;
      }>
    >("/outbound/orders/instant-driver-call", {
      method: "POST",
      data: {
        shipper_id: payload.shipper_id,
        ...(payload.order_ids?.length ? { order_ids: payload.order_ids } : {}),
        ...(payload.shipment_ids?.length
          ? { shipment_ids: payload.shipment_ids }
          : {}),
      },
    });
    return res.data;
  },

  recordDriverCall: async (
    shipmentId: string,
    data: {
      driver_name: string;
      driver_phone: string;
      driver_vehicle_plate?: string;
      driver_booking_code?: string;
      shipper_id?: string | number;
    },
    idCardPhoto?: File,
  ): Promise<ReconcileSummary | null> => {
    const form = new FormData();
    form.append("driver_name", data.driver_name);
    form.append("driver_phone", data.driver_phone);
    if (data.driver_vehicle_plate)
      form.append("driver_vehicle_plate", data.driver_vehicle_plate);
    if (data.driver_booking_code)
      form.append("driver_booking_code", data.driver_booking_code);
    if (data.shipper_id != null)
      form.append("shipper_id", String(data.shipper_id));
    if (idCardPhoto) form.append("driver_id_card", idCardPhoto);

    const res = await fetchClient<ApiResponse<unknown>>(
      `/outbound/shipments/${encodeURIComponent(shipmentId)}/driver-call`,
      {
        method: "POST",
        data: form,
        headers: { "Content-Type": undefined as unknown as string },
      },
    );
    return res.data as ReconcileSummary | null;
  },

  updateDriverCall: async (
    shipmentId: string,
    data: {
      driver_name?: string;
      driver_phone?: string;
      driver_vehicle_plate?: string;
      driver_booking_code?: string;
      driver_call_status?: string;
      shipper_id?: string | number;
    },
    idCardPhoto?: File,
  ): Promise<void> => {
    const form = new FormData();
    if (data.driver_name) form.append("driver_name", data.driver_name);
    if (data.driver_phone) form.append("driver_phone", data.driver_phone);
    if (data.driver_vehicle_plate)
      form.append("driver_vehicle_plate", data.driver_vehicle_plate);
    if (data.driver_booking_code)
      form.append("driver_booking_code", data.driver_booking_code);
    if (data.driver_call_status)
      form.append("driver_call_status", data.driver_call_status);
    if (data.shipper_id != null)
      form.append("shipper_id", String(data.shipper_id));
    if (idCardPhoto) form.append("driver_id_card", idCardPhoto);
    form.append("_method", "PATCH");

    await fetchClient(
      `/outbound/shipments/${encodeURIComponent(shipmentId)}/driver-call`,
      {
        method: "POST",
        data: form,
        headers: { "Content-Type": undefined as unknown as string },
      },
    );
  },

  markDelivered: async (shipmentId: string): Promise<void> => {
    await fetchClient(
      `/outbound/shipments/${encodeURIComponent(shipmentId)}/mark-delivered`,
      { method: "POST" },
    );
  },

  reconcileShipment: async (shipmentId: string): Promise<ReconcileSummary> => {
    const res = await fetchClient<ApiResponse<ReconcileSummary>>(
      `/outbound/shipments/${encodeURIComponent(shipmentId)}/reconcile`,
      { method: "POST" },
    );
    return res.data;
  },

  retryPickup: async (orderIds: string[]): Promise<ReadyToShipResult[]> => {
    const res = await fetchClient<{ data: RawReadyToShipResult[] }>(
      `/outbound/orders/retry-pickup`,
      { method: "POST", data: { order_ids: orderIds } },
    );
    return (res.data ?? []).map(mapShipResult);
  },

  picklistBulkPdf: async (orderIds: string[]): Promise<Blob> => {
    return fetchBlobPost(
      `/outbound/picklists/documents/bulk/pdf`,
      { order_ids: orderIds },
      "application/pdf",
    );
  },

  picklistBulkPdfAsync: async (orderIds: string[]) => {
    const res = await fetchClient<ApiResponse<{ export_id: string; status: string; total: number }>>(
      `/outbound/picklists/documents/bulk/pdf/async`,
      { method: "POST", data: { order_ids: orderIds } },
    );
    return res.data;
  },

  invoiceBulkPdf: async (orderIds: string[]): Promise<Blob> => {
    return fetchBlobPost(
      `/sales/invoices/bulk-pdf`,
      { order_ids: orderIds },
      "application/pdf",
    );
  },

  invoiceBulkPdfAsync: async (orderIds: string[]) => {
    const res = await fetchClient<ApiResponse<{ export_id: string; status: string; total: number }>>(
      `/sales/invoices/bulk-pdf/async`,
      { method: "POST", data: { order_ids: orderIds } },
    );
    return res.data;
  },

  createBulkShippingLabelBatch: async (
    orderIds: string[],
    documentSize: "thermal_100x150" | "thermal_100x120",
  ): Promise<{ batch_id: string }> => {
    const res = await fetchClient<ApiResponse<{ batch_id: string }>>(
      `/sales/shipping-labels/bulk`,
      {
        method: "POST",
        data: { order_ids: orderIds, document_size: documentSize },
      },
    );
    return res.data;
  },

  getBulkShippingLabelBatch: async (
    batchId: string,
  ): Promise<import("@/types/proses-pesanan/bulk-label").BulkLabelBatch> => {
    const res = await fetchClient<
      ApiResponse<import("@/types/proses-pesanan/bulk-label").BulkLabelBatch>
    >(`/sales/shipping-labels/bulk/${encodeURIComponent(batchId)}`);
    return res.data;
  },

  downloadBulkShippingLabelPdf: async (batchId: string): Promise<Blob> => {
    return fetchBlobRaw(
      `/sales/shipping-labels/bulk/${encodeURIComponent(batchId)}/pdf`,
      "application/pdf",
    );
  },

  retryFailedBulkShippingLabels: async (
    batchId: string,
  ): Promise<{ batch_id: string }> => {
    const res = await fetchClient<ApiResponse<{ batch_id: string }>>(
      `/sales/shipping-labels/bulk/${encodeURIComponent(batchId)}/retry-failed`,
      { method: "POST" },
    );
    return res.data;
  },

  pickListByPicklist: async (picklistId: string): Promise<unknown> => {
    const res = await fetchClient<ApiResponse<unknown>>(
      `/reports/wms/pick-list?picklist_id=${encodeURIComponent(picklistId)}`,
    );
    return res.data;
  },

  picklistPdf: async (
    picklistId: string,
    onProgress?: (message: string) => void,
  ): Promise<Blob> => {
    const res = await fetchClient<ApiResponse<{ export_id: string }>>(
      `/outbound/picklists/${encodeURIComponent(picklistId)}/pdf`,
    );
    const result = await ExportJobService.waitForBlob(
      res.data.export_id,
      "application/pdf",
      onProgress,
    );

    return result.blob;
  },

  picklistExcel: async (
    picklistId: string,
    onProgress?: (message: string) => void,
  ): Promise<Blob> => {
    const res = await fetchClient<ApiResponse<{ export_id: string }>>(
      `/outbound/picklists/${encodeURIComponent(picklistId)}/xlsx`,
    );
    const result = await ExportJobService.waitForBlob(
      res.data.export_id,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      onProgress,
    );

    return result.blob;
  },

  invoicePdf: async (orderId: string): Promise<Blob> => {
    return fetchBlobRaw(
      `/sales/${encodeURIComponent(orderId)}/invoice`,
      "application/pdf",
    );
  },

  orderBreakdownPdf: async (orderId: string): Promise<Blob> => {
    return fetchBlobRaw(
      `/sales/${encodeURIComponent(orderId)}/breakdown`,
      "application/pdf",
    );
  },

  manifestPdf: async (shipmentId: string): Promise<Blob> => {
    return fetchBlobRaw(
      `/outbound/shipments/${encodeURIComponent(shipmentId)}/manifest-pdf`,
      "application/pdf",
    );
  },

  manifestBulkPdf: async (orderIds: string[]): Promise<Blob> => {
    return fetchBlobPost(
      `/outbound/shipments/documents/bulk/manifest-pdf`,
      { order_ids: orderIds },
      "application/pdf",
    );
  },

  manifestBulkPdfAsync: async (orderIds: string[]) => {
    const res = await fetchClient<ApiResponse<{ export_id: string; status: string; total: number }>>(
      `/outbound/shipments/documents/bulk/manifest-pdf/async`,
      { method: "POST", data: { order_ids: orderIds } },
    );
    return res.data;
  },

  manifestExcel: async (shipmentId: string): Promise<Blob> => {
    return fetchBlobRaw(
      `/outbound/shipments/${encodeURIComponent(shipmentId)}/manifest-excel`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  },

  shipmentDetail: async (id: string): Promise<ShipmentDetail> => {
    const res = await fetchClient<{ data: RawShipmentDetail }>(
      `/outbound/shipments/${encodeURIComponent(id)}`,
    );
    return mapShipmentDetail(res.data);
  },

  shipmentOrdersPaginated: async (
    id: string,
    params: FulfillmentListParams,
  ): Promise<ListResult<ShipmentOrderItem>> => {
    const res = await fetchClient<ApiPaginated<RawShipmentOrder>>(
      `/outbound/shipments/${encodeURIComponent(id)}/orders?${buildQuery(params)}`,
    );
    return {
      items: (res.data ?? []).map(mapShipmentOrderItem),
      meta: res.meta ?? FALLBACK_META,
    };
  },

  scanOrderToShipment: async (
    shipmentId: string,
    barcode: string,
  ): Promise<ShipmentScanResult> => {
    const res = await fetchClient<{ data: RawShipmentDetail }>(
      `/outbound/shipments/${encodeURIComponent(shipmentId)}/scan-order`,
      { method: "POST", data: { barcode } },
    );
    const scan = res.data.scan_result;
    if (!scan?.shipment_order) {
      throw new Error("Respons scan tidak memuat pesanan yang dipindai.");
    }

    return {
      status: scan.status,
      barcode: scan.barcode,
      shipmentOrder: mapShipmentOrderItem(scan.shipment_order),
    };
  },

  removeOrderFromShipment: async (
    shipmentId: string,
    orderIds: string[],
  ): Promise<ShipmentDetail> => {
    const res = await fetchClient<{ data: RawShipmentDetail }>(
      `/outbound/shipments/${encodeURIComponent(shipmentId)}/remove-orders`,
      { method: "POST", data: { order_ids: orderIds } },
    );
    return mapShipmentDetail(res.data);
  },

  deleteFulfillmentOrder: async (
    orderId: string,
    reason?: string,
  ): Promise<void> => {
    const qs = reason ? `?reason=${encodeURIComponent(reason)}` : "";
    await fetchClient(`/outbound/orders/${encodeURIComponent(orderId)}${qs}`, {
      method: "DELETE",
    });
  },

  bulkDeleteFulfillmentOrders: async (
    orderIds: string[],
    reason: string,
  ): Promise<ReadyToShipResult[]> => {
    const res = await fetchClient<{ data: RawReadyToShipResult[] }>(
      `/outbound/orders/bulk-delete`,
      { method: "POST", data: { order_ids: orderIds, reason } },
    );
    return (res.data ?? []).map(mapShipResult);
  },

  preManifestCancelList: async (
    params: FulfillmentListParams,
  ): Promise<ListResult<FulfillmentOrder>> => {
    const q = new URLSearchParams();
    if (params.q) q.set("search", params.q);
    if (params.source) q.set("filter[source]", params.source);
    if (params.location_id) q.set("filter[location_id]", params.location_id);
    q.set("per_page", String(params.per_page ?? 20));
    q.set("page", String(params.page ?? 1));
    const res = await fetchClient<{
      success?: boolean;
      data: RawFulfillmentOrder[];
      meta: Meta;
    }>(`/outbound/pre-manifest/cancelled?${q}`);
    return {
      items: (res.data ?? []).map(mapOrder),
      meta: res.meta ?? FALLBACK_META,
    };
  },

  preManifestCancelCount: async (): Promise<number> => {
    const res = await fetchClient<{ data: { count: number } }>(
      `/outbound/pre-manifest/cancelled/count`,
    );
    return Number(res.data?.count ?? 0);
  },

  preManifestCancelDismiss: async (orderId: string): Promise<void> => {
    await fetchClient(
      `/outbound/pre-manifest/cancelled/${encodeURIComponent(orderId)}/dismiss`,
      { method: "PATCH" },
    );
  },

  preManifestCancelUndismiss: async (orderId: string): Promise<void> => {
    await fetchClient(
      `/outbound/pre-manifest/cancelled/${encodeURIComponent(orderId)}/undismiss`,
      { method: "PATCH" },
    );
  },

  preManifestCancelExport: async (opts?: {
    date_from?: string | null;
    date_to?: string | null;
    source?: string | null;
  }): Promise<Blob> => {
    const params = new URLSearchParams();
    if (opts?.date_from) params.set("date_from", opts.date_from);
    if (opts?.date_to) params.set("date_to", opts.date_to);
    if (opts?.source) params.set("source", opts.source);
    const qs = params.toString() ? `?${params}` : "";
    return fetchBlobRaw(
      `/outbound/pre-manifest/cancelled/export${qs}`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  },

  unassignPicklist: async (
    picklistId: string,
    payload: {
      reason_code: string;
      reason_note?: string;
      new_assignee_id?: string;
    },
  ) => {
    const res = await fetchClient<{ data: unknown }>(
      `/outbound/picklists/${picklistId}/assignment`,
      { method: "DELETE", data: payload },
    );
    return res.data;
  },

  resetPicklistAssignment: async (
    picklistId: string,
    payload: { reason_note: string; new_assignee_id?: string },
  ) => {
    const res = await fetchClient<{ data: unknown }>(
      `/outbound/picklists/${picklistId}/assignment/reset`,
      { method: "POST", data: payload },
    );
    return res.data;
  },
};
