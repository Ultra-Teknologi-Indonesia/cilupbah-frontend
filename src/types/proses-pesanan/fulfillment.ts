export type FulfillmentStage =
  "pantauan" | "picking" | "packing" | "shipping" | "delivered" | "done";

export interface StageSub {
  key: string;
  label: string;
}

export interface StageConfigItem {
  key: FulfillmentStage;
  label: string;
  subs: StageSub[];
}

export interface FulfillmentBoardCounts {
  picking: {
    belum: number;
    diproses: number;
    selesai: number;
  };
  packing: {
    belum: number;
    diproses: number;
    selesai: number;
  };
  shipping: {
    "siap-kirim": number;
    jadwal: number;
    batal: number;
  };
}

export const STAGE_CONFIG: readonly StageConfigItem[] = [
  { key: "pantauan", label: "Pantauan", subs: [] },
  {
    key: "picking",
    label: "Picking",
    subs: [
      { key: "belum", label: "Belum Mulai" },
      { key: "diproses", label: "Diproses" },
      { key: "selesai", label: "Selesai" },
    ],
  },
  {
    key: "packing",
    label: "Packing",
    subs: [
      { key: "belum", label: "Belum Mulai" },
      { key: "diproses", label: "Diproses" },
      { key: "selesai", label: "Selesai" },
    ],
  },
  {
    key: "shipping",
    label: "Shipping",
    subs: [
      { key: "siap-kirim", label: "Siap Kirim" },
      { key: "jadwal", label: "Jadwal Pengiriman" },
      { key: "batal", label: "Batal Pra-Manifest" },
    ],
  },
  { key: "delivered", label: "Sudah Dikirim", subs: [] },
  { key: "done", label: "Selesai", subs: [] },
];

export function stageConfig(
  stage: FulfillmentStage,
): StageConfigItem | undefined {
  return STAGE_CONFIG.find((s) => s.key === stage);
}

export function defaultSubFor(stage: FulfillmentStage): string | null {
  const cfg = stageConfig(stage);
  return cfg && cfg.subs.length ? cfg.subs[0].key : null;
}

export interface RawOutboundMonitoringPeriod {
  day_term: number;
  ready_to_process: number;
  pick: number;
  pending: number;
  pack: number;
  ready_to_ship: number;
  waiting_ship: number;
}

export interface RawOutboundMonitoringSummary {
  today: number;
  yest: number;
  mtd: number;
  prev_month: number;
  ready_to_pick?: number;
  ready_to_pick_2days?: number;
  ready_to_process_today?: number;
  ready_to_process?: number;
  pending_from_two_days_ago?: number;
  picked_today: number;
  picked_yest: number;
}

export interface RawOutboundMonitoring {
  summary: RawOutboundMonitoringSummary;
  periods: RawOutboundMonitoringPeriod[];
}

export interface OutboundMonitoringPeriod {
  dayTerm: number;
  readyToProcess: number;
  pick: number;
  pending: number;
  pack: number;
  readyToShip: number;
  waitingShip: number;
}

export interface OutboundMonitoringSummary {
  today: number;
  yest: number;
  mtd: number;
  prevMonth: number;
  readyToProcess: number;
  pendingFromTwoDaysAgo: number;
  pickedToday: number;
  pickedYest: number;
}

export interface OutboundMonitoring {
  summary: OutboundMonitoringSummary;
  periods: OutboundMonitoringPeriod[];
}

export const PICKING_ORDER_STAGE = {
  belum: "ready-to-process",
  selesai: "finish-pick",
} as const;

export interface FulfillmentListParams {
  sub?: string | null;
  q?: string;
  location_id?: string;
  source?: string;
  status?: string;
  page?: number;
  per_page?: number;

  shipping_provider?: string;
  channel_shop_id?: string;
  channel_status?: string;
  payment?: "cod" | "noncod";
  courier_type?: "instant" | "regular";
  awb?: "yes" | "no";
  label_printed?: "yes" | "no";
  date_from?: string;
  date_to?: string;
  exclude_transit?: "1";
  zone_id?: string;
  courier_code?: string;
  courier_name?: string;
  shipment_type?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface RawFulfillmentOrderItem {
  id: string;
  sku: string;
  description: string;
  qty_in_base: number;
  image_url?: string | null;
}

export interface RawFulfillmentOrder {
  id: string;
  salesorder_no: string;
  channel_order_no?: string | null;
  channel_buyer_id?: string | null;
  customer_name?: string | null;
  shipping_full_name?: string | null;
  source?: string | null;
  commerce_platform?: string | null;
  channel_shop_id?: string | null;
  is_manual?: boolean;
  shipping_label_supported?: boolean;
  status?: string | null;
  is_paid?: boolean;
  transaction_date?: string | null;
  grand_total?: number | null;
  actual_shipping_fee?: number | null;
  order_weight_gram?: number | null;
  location_id?: string | null;
  location_name?: string | null;
  location?: {
    id: string;
    location_name: string;
    location_code: string;
  } | null;
  tracking_number?: string | null;
  shipping_provider?: string | null;
  is_cod?: boolean;
  priority_fulfillment?: boolean;
  is_split_order?: boolean;
  channel_status?: string | null;
  cancel_by?: string | null;
  is_canceled?: boolean | null;
  cancel_requested_at?: string | null;
  cancel_reason?: string | null;
  cancel_accepted_at?: string | null;
  fulfillment_flag?: string | null;
  days_to_ship?: number | null;
  ship_by_date?: string | null;
  pickup_done_time?: string | null;
  dropshipper_name?: string | null;
  dropshipper_phone?: string | null;
  total_qty?: number | null;
  total_sku?: number | null;
  is_instant?: boolean;
  shipping_type?: string | null;
  driver_call_status?: "pending" | "success" | "failed" | null;
  driver_call_message?: string | null;
  driver_call_attempted_at?: string | null;
  picker_name?: string | null;
  packer_name?: string | null;
  picklist_id?: string | null;
  picklist_no?: string | null;
  invoice_id?: string | null;
  invoice_no?: string | null;
  items?: RawFulfillmentOrderItem[] | null;
}

export interface FulfillmentOrderItem {
  id: string;
  sku: string;
  description: string;
  qty: number;
  imageUrl: string | null;
}

export interface FulfillmentOrder {
  id: string;
  salesorderNo: string;
  channelOrderNo: string | null;
  channelBuyerId: string | null;
  customerName: string | null;
  source: string | null;
  commercePlatform?: string | null;
  channelShopId: string | null;
  isManual: boolean;
  shippingLabelSupported: boolean;
  status: string | null;
  isPaid: boolean;
  transactionDate: string | null;
  grandTotal: number;
  actualShippingFee: number | null;
  orderWeightGram: number | null;
  locationId: string | null;
  locationName: string | null;
  trackingNumber: string | null;
  shippingProvider: string | null;
  isCod: boolean;
  priorityFulfillment: boolean;
  isSplitOrder: boolean;
  channelStatus: string | null;
  cancelBy: string | null;
  isCanceled: boolean;
  cancelRequestedAt: string | null;
  cancelReason: string | null;
  cancelAcceptedAt: string | null;
  fulfillmentFlag: string | null;
  daysToShip: number | null;
  shipByDate: string | null;
  pickupDoneTime: string | null;
  dropshipperName: string | null;
  dropshipperPhone: string | null;
  totalQty: number | null;
  totalSku: number | null;
  isInstant: boolean;
  shippingType: string | null;
  driverCallStatus: "pending" | "success" | "failed" | null;
  driverCallMessage: string | null;
  driverCallAttemptedAt: string | null;
  pickerName: string | null;
  packerName: string | null;
  picklistId: string | null;
  picklistNo: string | null;
  invoiceId?: string | null;
  invoiceNo?: string | null;
  items: FulfillmentOrderItem[];
}

export type PicklistStatus =
  "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface RawPicklist {
  id: string;
  picklist_no: string;
  location_id?: string | null;
  picker_id?: string | null;
  assigned_by?: string | null;
  assigned_at?: string | null;
  status?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  updated_version_at?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  items_count?: number;
  items_sum_qty_ordered?: number | null;
  items_sum_qty_picked?: number | null;
  has_instant?: boolean;
  location?: {
    id: string;
    location_name?: string | null;
    location_code?: string | null;
  } | null;
  picker?: { id: string; name?: string | null; email?: string | null } | null;
}

export interface Picklist {
  id: string;
  picklistNo: string;
  locationId: string | null;
  locationName: string | null;
  pickerId: string | null;
  pickerName: string | null;
  assignedBy: string | null;
  assignedAt: string | null;
  createdAt: string | null;
  status: PicklistStatus;
  startedAt: string | null;
  completedAt: string | null;
  updatedVersionAt: string | null;
  notes: string | null;
  itemsCount: number;
  qtyOrdered: number;
  qtyPicked: number;
  hasInstant: boolean;
}

export const PICKLIST_STATUS_LABEL: Record<
  PicklistStatus,
  { label: string; className: string }
> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  IN_PROGRESS: { label: "Diproses", className: "bg-blue-500/10 text-blue-600" },
  COMPLETED: {
    label: "Selesai",
    className: "bg-emerald-500/10 text-emerald-600",
  },
  FAILED: { label: "Gagal", className: "bg-destructive/10 text-destructive" },
  CANCELLED: {
    label: "Dibatalkan",
    className: "bg-muted text-muted-foreground",
  },
};

export interface RawPicker {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface Picker {
  id: string;
  name: string;
  email: string | null;
}

export interface RawReadyToShipResult {
  order_id: string;
  salesorder_no?: string | null;
  source?: string | null;
  status?: "success" | "failed" | "skipped" | string;
  message?: string | null;
}

export interface ReadyToShipResult {
  orderId: string;
  salesorderNo: string | null;
  source: string | null;
  status: "success" | "failed" | "skipped" | string;
  message: string | null;
}

export interface RawPicklistMedia {
  id?: string;
  url?: string | null;
  is_primary?: boolean | null;
  sort_order?: number | null;
}

export type PicklistItemStatus =
  | "PENDING"
  | "PARTIAL"
  | "COMPLETED"
  | "SHORT"
  | "REJECTED"
  | "PROCESSED_EXTERNALLY";

export type PicklistFailReasonCode =
  "STOCK_EMPTY" | "DAMAGED" | "REJECTED" | "MISSING" | "OTHER";

export interface RawPicklistItem {
  id: string;
  sku: string;
  item_id?: string | null;
  order_id?: string | null;
  bin_id?: string | null;
  qty_ordered?: number;
  qty_picked?: number;
  status?: string | null;
  item_status?: string | null;
  fail_reason_code?: string | null;
  fail_reason_note?: string | null;
  failed_qty?: number | null;
  last_picked_by_name?: string | null;
  last_picked_at?: string | null;

  image_url?: string | null;
  product?: {
    sku?: string | null;
    barcode?: string | null;
    variant_name?: string | null;
    image_url?: string | null;
    media?: RawPicklistMedia[] | null;
    product?: {
      name?: string | null;
      image_url?: string | null;
      media?: RawPicklistMedia[] | null;
    } | null;
  } | null;
  bin?: { bin_final_code?: string | null; bin_code?: string | null } | null;
  order?: {
    salesorder_no?: string | null;
    tracking_number?: string | null;
    package_no?: string | null;
    shipment_no?: string | null;
    source?: string | null;
    shipment_orders?: Array<{
      shipment?: { shipment_no?: string | null } | null;
    }> | null;
  } | null;
  orderItem?: {
    description?: string | null;
    image_url?: string | null;
    variant_name?: string | null;
  } | null;
}

export interface PicklistItem {
  id: string;
  sku: string;
  name: string | null;
  variantName: string | null;
  imageUrl: string | null;
  binCode: string | null;
  orderId: string | null;
  orderNo: string | null;
  source: string | null;
  trackingNumber: string | null;
  packageNo: string | null;
  itemStatus: PicklistItemStatus | null;
  failReasonCode: PicklistFailReasonCode | null;
  failReasonNote: string | null;
  failedQty: number | null;
  qtyOrdered: number;
  qtyPicked: number;
  lastPickedByName: string | null;
  lastPickedAt: string | null;
}

export const PICKLIST_ITEM_STATUS_LABEL: Record<
  PicklistItemStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Belum",
    className: "bg-muted text-muted-foreground",
  },
  PARTIAL: {
    label: "Sebagian",
    className: "bg-warning/10 text-warning",
  },
  COMPLETED: {
    label: "Selesai",
    className: "bg-emerald-500/10 text-emerald-600",
  },
  SHORT: {
    label: "Kurang",
    className: "bg-amber-500/10 text-amber-700",
  },
  REJECTED: {
    label: "Ditolak",
    className: "bg-destructive/10 text-destructive",
  },
  PROCESSED_EXTERNALLY: {
    label: "Diproses channel",
    className: "bg-sky-500/10 text-sky-700",
  },
};

export const FAIL_REASON_LABEL: Record<PicklistFailReasonCode, string> = {
  STOCK_EMPTY: "Stok habis",
  DAMAGED: "Rusak",
  REJECTED: "Ditolak",
  MISSING: "Hilang",
  OTHER: "Lainnya",
};

export interface RawPicklistDetail extends RawPicklist {
  items?: RawPicklistItem[];
}

export interface PicklistDetail extends Picklist {
  items: PicklistItem[];
}

export type PacklistStatus =
  "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface RawPacklist {
  id: string;
  packlist_no: string;
  location_id?: string | null;
  packer_id?: string | null;
  order_id?: string | null;
  status?: string | null;
  package_count?: number;
  location?: { id: string; location_name?: string | null } | null;
  packer?: { id: string; name?: string | null; email?: string | null } | null;
  order?: {
    id: string;
    salesorder_no?: string | null;
    customer_name?: string | null;
    transaction_date?: string | null;
    is_instant?: boolean;
    shipping_provider?: string | null;
    shipping_type?: string | null;
    source?: string | null;
    tracking_number?: string | null;
  } | null;
}

export interface Packlist {
  id: string;
  packlistNo: string;
  locationId: string | null;
  locationName: string | null;
  packerId: string | null;
  packerName: string | null;
  orderId: string | null;
  orderNo: string | null;
  customerName: string | null;
  transactionDate: string | null;
  status: PacklistStatus;
  packageCount: number;
  isInstant: boolean;
  shippingProvider: string | null;
  shippingType: string | null;
  source: string | null;
  trackingNumber: string | null;
}

export interface RawPacklistItem {
  id: string;
  sku: string;
  item_id?: string | null;
  qty_ordered?: number;
  qty_packed?: number;
  barcode_verified?: boolean;
  product?: {
    sku?: string | null;
    product_id?: string | null;
    media?: RawPicklistMedia[] | null;
    product?: {
      name?: string | null;
      media?: RawPicklistMedia[] | null;
    } | null;
  } | null;
  order_item?: {
    sku?: string | null;
    description?: string | null;
    image_url?: string | null;
    product?: {
      sku?: string | null;
      product_id?: string | null;
      media?: RawPicklistMedia[] | null;
      product?: {
        name?: string | null;
        media?: RawPicklistMedia[] | null;
      } | null;
    } | null;
  } | null;
}

export interface PacklistItem {
  id: string;
  sku: string;
  description: string | null;
  imageUrl: string | null;
  qtyOrdered: number;
  qtyPacked: number;
  barcodeVerified: boolean;
}

export interface RawPacklistDetail extends RawPacklist {
  items?: RawPacklistItem[];
}

export interface PacklistDetail extends Packlist {
  items: PacklistItem[];
}

export const PACKLIST_STATUS_LABEL: Record<
  PacklistStatus,
  { label: string; className: string }
> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  IN_PROGRESS: { label: "Diproses", className: "bg-blue-500/10 text-blue-600" },
  COMPLETED: {
    label: "Selesai",
    className: "bg-emerald-500/10 text-emerald-600",
  },
  CANCELLED: {
    label: "Dibatalkan",
    className: "bg-muted text-muted-foreground",
  },
};

export type ShipmentStatus =
  "SCHEDULED" | "HANDED_OVER" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

export type ShipmentType =
  "REGULAR" | "EXPRESS" | "SAME_DAY" | "CARGO" | "INSTANT";

export const SHIPMENT_TYPES: { value: ShipmentType; label: string }[] = [
  { value: "REGULAR", label: "Reguler" },
  { value: "EXPRESS", label: "Express" },
  { value: "SAME_DAY", label: "Same Day" },
  { value: "CARGO", label: "Cargo" },
  { value: "INSTANT", label: "Instant" },
];

export type DriverCallStatus = "NONE" | "CALLED" | "PICKED_UP" | "FAILED";
export type DriverCallMethod =
  | "MANUAL"
  | "SHOPEE_AUTO"
  | "SHOPEE_INSTANT"
  | "TIKTOK_INSTANT"
  | "LAZADA_INSTANT";

export interface RawShipment {
  id: string;
  shipment_no: string;
  location_id?: string | null;
  location?: { id: string; location_name?: string | null } | null;
  courier_code?: string | null;
  courier_name?: string | null;
  shipment_type?: string | null;
  shipment_date?: string | null;
  status?: string | null;
  handed_over_at?: string | null;
  orders_count?: number;
  total_weight_gram?: number | null;
  has_instant?: boolean;
  created_at?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_vehicle_plate?: string | null;
  driver_booking_code?: string | null;
  driver_call_method?: string | null;
  driver_call_status?: string | null;
  driver_called_at?: string | null;
  driver_called_by?: string | null;
  driver_id_card_url?: string | null;
  shipper_id?: string | number | null;
  shipper?: {
    id: string | number;
    name?: string | null;
    email?: string | null;
  } | null;
}

export interface Shipment {
  id: string;
  shipmentNo: string;
  locationId: string | null;
  locationName: string | null;
  courierCode: string | null;
  courierName: string | null;
  shipmentType: string | null;
  shipmentDate: string | null;
  status: ShipmentStatus;
  handedOverAt: string | null;
  ordersCount: number;
  totalWeightGram: number;
  hasInstant: boolean;
  createdAt: string | null;
  driverName: string | null;
  driverPhone: string | null;
  driverVehiclePlate: string | null;
  driverBookingCode: string | null;
  driverCallMethod: DriverCallMethod | null;
  driverCallStatus: DriverCallStatus | null;
  driverCalledAt: string | null;
  driverCalledBy: string | null;
  driverIdCardUrl: string | null;
  shipperId: string | null;
  shipperName: string | null;
}

export const SHIPMENT_STATUS_LABEL: Record<
  ShipmentStatus,
  { label: string; className: string }
> = {
  SCHEDULED: { label: "Terjadwal", className: "bg-blue-500/10 text-blue-600" },
  HANDED_OVER: {
    label: "Diserahkan",
    className: "bg-amber-500/10 text-amber-600",
  },
  IN_TRANSIT: {
    label: "Dikirim",
    className: "bg-indigo-500/10 text-indigo-600",
  },
  DELIVERED: {
    label: "Terkirim",
    className: "bg-emerald-500/10 text-emerald-600",
  },
  CANCELLED: {
    label: "Dibatalkan",
    className: "bg-muted text-muted-foreground",
  },
};

export interface RawShipmentOrder {
  id: string;
  shipment_id: string;
  order_id: string;
  packlist_id?: string | null;
  tracking_number?: string | null;
  qty_given?: number | null;
  pickup_status?: string | null;
  pickup_message?: string | null;
  scanned_at?: string | null;
  order?: {
    id: string;
    salesorder_no?: string | null;
    customer_name?: string | null;
    status?: string | null;
    grand_total?: string | number | null;
    shipping_provider?: string | null;
    tracking_number?: string | null;
    source?: string | null;
    channel_order_no?: string | null;
    order_weight_gram?: number | null;
    channel_status?: string | null;
    transaction_date?: string | null;
  } | null;
  packlist?: {
    id: string;
    packlist_no?: string | null;
  } | null;
}

export interface RawShipmentDetail extends RawShipment {
  orders?: RawShipmentOrder[];
  notes?: string | null;
  created_by?: string | null;
  scan_result?: {
    status: "added" | "already_added";
    barcode: string;
    shipment_order: RawShipmentOrder;
  } | null;
}

export interface ShipmentOrderItem {
  id: string;
  orderId: string;
  orderNo: string | null;
  transactionDate: string | null;
  customerName: string | null;
  trackingNumber: string | null;
  shippingProvider: string | null;
  source: string | null;
  grandTotal: number;
  weightGram: number;
  status: string | null;
  channelStatus: string | null;
  packlistNo: string | null;
  pickupStatus: string | null;
  pickupMessage: string | null;
  scannedAt: string | null;
}

export interface ShipmentScanResult {
  status: "added" | "already_added";
  barcode: string;
  shipmentOrder: ShipmentOrderItem;
}

export interface ShipmentDetail extends Shipment {
  orders: ShipmentOrderItem[];
  notes: string | null;
  createdBy: string | null;
}

export interface ReconcileSummary {
  total: number;
  delivered: number;
  in_transit: number;
  anomaly: number;
  auto_marked_delivered?: boolean;
  details: {
    order_id: string;
    salesorder_no: string;
    status: string;
    channel_status: string | null;
    category: "delivered" | "in_transit" | "anomaly";
  }[];
}

export interface RawCourier {
  id: string;
  name?: string | null;
  code?: string | null;
  logo_url?: string | null;
  is_active?: boolean;
}

export interface Courier {
  id: string;
  name: string;
  code: string | null;
  logoUrl: string | null;
  isActive: boolean;
}

export interface RawCompletedShipmentOrderRow {
  order_id: string | null;
  salesorder_no: string | null;
  customer_name: string | null;
  tracking_number: string | null;
  source: string | null;
  channel_status: string | null;
  channel_order_no: string | null;
  transaction_date: string | null;
  shipping_provider: string | null;
  courier_name: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_province: string | null;
  shipment_id: string | null;
  shipment_no: string | null;
  shipment_type: string | null;
  shipment_status: ShipmentStatus;
  shipment_date: string | null;
  handed_over_at: string | null;
  location_name: string | null;
  picklist_no: string | null;
  qty_given: number | null;
  pickup_code: string | null;
}

export interface CompletedShipmentOrderRow {
  orderId: string | null;
  salesorderNo: string | null;
  customerName: string | null;
  trackingNumber: string | null;
  source: string | null;
  channelStatus: string | null;
  channelOrderNo: string | null;
  transactionDate: string | null;
  shippingProvider: string | null;
  courierName: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingProvince: string | null;
  shipmentId: string | null;
  shipmentNo: string | null;
  shipmentType: string | null;
  shipmentStatus: ShipmentStatus;
  shipmentDate: string | null;
  handedOverAt: string | null;
  locationName: string | null;
  picklistNo: string | null;
  qtyGiven: number | null;
  pickupCode: string | null;
}
