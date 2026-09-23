export type OrderTab =
  | "all"
  | "unpaid"
  | "ready-to-process"
  | "in-transit"
  | "completed"
  | "failed"
  | "empty-stock"
  | "failed-pick"
  | "cancellation"
  | "channel-cancel"
  | "returned";

export type ChannelCancelSub = "pending" | "failed" | "accepted";

export type CancellationSub =
  "pending" | "accepted" | "rejected" | "cancelled" | "post_pack";
export type ReturnSub = "pending" | "accepted" | "rejected";
export type SubFilter = CancellationSub | ReturnSub | null;

export type OrderStatus =
  "pending" | "reserved" | "picked" | "packed" | "shipped" | "cancelled";

export type ContactChannel =
  "marketplace_chat" | "whatsapp" | "phone" | "other";

export type CustomerDecision = "waiting" | "cancel" | "replace";

export const CONTACT_CHANNEL_LABELS: Record<ContactChannel, string> = {
  marketplace_chat: "Chat Marketplace",
  whatsapp: "WhatsApp",
  phone: "Telepon",
  other: "Lainnya",
};

export const CUSTOMER_DECISION_LABELS: Record<CustomerDecision, string> = {
  waiting: "Menunggu",
  cancel: "Batal",
  replace: "Ganti Barang",
};

export interface OrderListParams {
  tab?: OrderTab;
  sub?: string;
  q?: string;
  channel?: string;
  store_id?: string;
  location_id?: string;
  content_type?: "combo" | "single_1qty" | "single_nqty";
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";

  shipping_provider?: string | string[];
  payment?: "cod" | "noncod";
  label_printed?: "yes" | "no";
  contact_status?: "contacted" | "not_contacted";
  decision?: CustomerDecision;
  status?: string[];
  item_id?: string;
}

export type OrderCountParams = Omit<
  OrderListParams,
  "tab" | "sub" | "page" | "per_page" | "sort" | "sort_by" | "sort_dir"
>;

export const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "cancelled", label: "Batal" },
  { value: "unpaid", label: "Belum Bayar" },
  { value: "failed-pick", label: "Gagal Pengambilan" },
  { value: "returned", label: "Retur" },
  { value: "waiting-shipment", label: "Menunggu Kirim" },
  { value: "picking-belum", label: "Pengambilan Belum" },
  { value: "picking-diproses", label: "Pengambilan Diproses" },
  { value: "picking-selesai", label: "Pengambilan Selesai" },
  { value: "packing-diproses", label: "Pengepakan Diproses" },
  { value: "cancel-requested", label: "Request Batal" },
  { value: "completed", label: "Selesai" },
  { value: "ready-to-ship", label: "Siap Kirim" },
  { value: "ready-to-process", label: "Siap Proses" },
  { value: "empty-stock", label: "Stok Kosong" },
  { value: "in-transit", label: "Sudah Dikirim" },
];

export interface StatusHistoryEntry {
  action: string;
  action_id: string;
  actor_email: string | null;
  actor_name: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  salesorder_no: string;
  channel_order_no: string | null;
  source: string | null;
  commerce_platform?: string | null;
  is_manual?: boolean;
  shipping_label_supported?: boolean;
  channel_shop_id: string | null;
  shop_name: string | null;
  customer_name: string;
  transaction_date: string | null;
  status: OrderStatus;
  status_label?: string | null;
  wms_status?: string | null;
  status_history?: StatusHistoryEntry[];
  channel_status: string | null;
  channel_status_raw: string | null;
  is_shadow: boolean;
  is_paid: boolean;
  is_canceled: boolean;
  cancel_reason: string | null;
  cancel_requested_at: string | null;
  cancel_request_reason: string | null;
  cancel_accepted_at: string | null;
  buyer_cancel_sync_status:
    | "pending"
    | "sending"
    | "succeeded"
    | "failed"
    | "unsupported"
    | "stale"
    | null;
  buyer_cancel_sync_status_label: string | null;
  buyer_cancel_sync_decision: "accept" | "reject" | null;
  buyer_cancel_sync_error: string | null;
  buyer_cancel_synced_at: string | null;
  buyer_cancel_channel_reference: string | null;
  cancel_channel: "auto" | "manual" | null;
  channel_cancel_status: "pending" | "accepted" | "rejected" | "failed" | null;
  channel_cancel_error: string | null;
  channel_cancel_requested_at: string | null;
  pick_failed_at: string | null;
  pick_failed_by: string | null;
  pick_fail_reason: string | null;
  contacted_at: string | null;
  contacted_by: string | null;
  contact_channel: ContactChannel | null;
  customer_decision: CustomerDecision | null;
  decision_at: string | null;
  decision_by: string | null;
  contact_note: string | null;
  handed_to_warehouse_at: string | null;
  payment_method: string | null;
  payment_method_name: string | null;
  paid_time: string | null;
  sub_total: number;
  total_disc: number;
  total_tax: number;
  shipping_cost: number;
  insurance_cost: number;
  grand_total: number;
  finance: OrderFinance;
  shipping: OrderShipping;
  buyer_message: string | null;
  seller_note: string | null;
  location_id: string | null;
  location_name: string | null;
  scheduled_shipment?: {
    id: string;
    shipment_no: string;
    status: string;
    shipment_date: string | null;
    courier_name: string | null;
    courier_code: string | null;
  } | null;
  total_qty: number;
  total_sku: number;
  items: OrderItem[];
  received_date: string | null;
  ship_by_date: string | null;
  has_unmapped_items?: boolean;
  has_stock_shortfall?: boolean;
  is_instant?: boolean;
  priority_fulfillment?: boolean;
  is_cod?: boolean;
  shipping_type?: string | null;
  driver_call_status?: "pending" | "success" | "failed" | null;
  driver_call_message?: string | null;
  driver_call_attempted_at?: string | null;
  courier_pickup?: CourierPickup | null;
  picker_name?: string | null;
  packer_name?: string | null;
  picklist_id?: string | null;
  picklist_no?: string | null;
  invoice_id?: string | null;
  invoice_no?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourierPickup {
  courier_name: string | null;
  courier_phone: string | null;
  pickup_code: string | null;
  id_photo_url: string | null;
  id_photo_thumb: string | null;
  recorded_at: string | null;
  recorded_by: string | null;
}

export interface OrderFeeLine {
  fee_type: string;
  channel_fee_code: string | null;
  amount: number;
}

export interface OrderFinance {
  gross_amount: number | null;
  seller_voucher: number | null;
  platform_voucher: number | null;
  payment_voucher: number | null;
  commission_fee: number | null;
  service_fee: number | null;
  transaction_fee: number | null;
  affiliate_commission: number | null;
  order_processing_fee: number | null;
  seller_shipping_borne: number | null;
  platform_shipping_rebate: number | null;
  total_tax: number | null;
  insurance_cost: number | null;
  settlement_amount: number | null;
  refund_total: number | null;
  currency: string;
  is_settled: boolean;
  settled_at: string | null;
  synced_at: string | null;
  fee_lines?: OrderFeeLine[];
}

export interface OrderShipping {
  full_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  post_code: string | null;
  country: string | null;
  provider: string | null;
  tracking_number: string | null;
}

export interface OrderItem {
  id: string;
  item_id: string | null;
  channel_product_id: string | null;
  sku: string;
  description: string | null;
  qty_in_base: number;
  price: number;
  disc: number;
  disc_amount: number;
  tax_amount: number;
  amount: number;
  image_url: string | null;
}

export interface OrderTabCounts {
  all: number;
  unpaid: number;
  failed: number;
  "ready-to-process": number;
  "in-transit": number;
  completed: number;
  "empty-stock": number;
  "failed-pick": number;
  cancellation: number;
  "channel-cancel": number;
  returned: number;
}

interface TabConfigItem {
  key: string;
  label: string;
  zone: "lifecycle" | "problem" | "admin";
}

export const TAB_CONFIG: readonly TabConfigItem[] = [
  { key: "all", label: "Semua", zone: "lifecycle" },
  { key: "unpaid", label: "Belum Dibayar", zone: "lifecycle" },
  { key: "ready-to-process", label: "Siap Proses", zone: "lifecycle" },
  { key: "failed", label: "Gagal Download", zone: "problem" },
  { key: "empty-stock", label: "Stok Kosong", zone: "problem" },
  { key: "failed-pick", label: "Gagal Picking", zone: "problem" },
  { key: "cancellation", label: "Request Cancel", zone: "admin" },
  { key: "channel-cancel", label: "Batal ke Marketplace", zone: "admin" },
  { key: "returned", label: "Diretur", zone: "admin" },
] as const;

export const SUB_PILL_CONFIG: Partial<
  Record<OrderTab, { key: string; label: string }[]>
> = {
  "empty-stock": [
    { key: "waiting", label: "Menunggu Konfirmasi" },
    { key: "confirmed", label: "Sudah Konfirmasi" },
  ],
  cancellation: [
    { key: "pending", label: "Perlu Diproses" },
    { key: "post_pack", label: "Batal Setelah Packing" },
    { key: "accepted", label: "Disetujui" },
    { key: "rejected", label: "Ditolak" },
    { key: "cancelled", label: "Riwayat Dibatalkan" },
  ],
  "channel-cancel": [
    { key: "pending", label: "Diproses" },
    { key: "failed", label: "Ditolak" },
    { key: "accepted", label: "Berhasil" },
  ],
  returned: [
    { key: "pending", label: "Menunggu" },
    { key: "accepted", label: "Diterima" },
    { key: "rejected", label: "Ditolak" },
  ],
};

export const STATUS_LABELS: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Menunggu",
    className:
      "text-orange-700 bg-orange-50 border-orange-300 dark:text-orange-300 dark:bg-orange-500/10 dark:border-orange-500/20",
  },
  reserved: {
    label: "Siap Proses",
    className:
      "text-blue-700 bg-blue-50 border-blue-300 dark:text-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20",
  },
  "ready-to-process": {
    label: "Siap Proses",
    className:
      "text-blue-700 bg-blue-50 border-blue-300 dark:text-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20",
  },
  "ready-to-pick": {
    label: "Pengambilan - Siap Diambil",
    className:
      "text-indigo-700 bg-indigo-50 border-indigo-300 dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-500/20",
  },
  "on-picking": {
    label: "Pengambilan - Sedang Diproses",
    className:
      "text-indigo-700 bg-indigo-50 border-indigo-300 dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-500/20",
  },
  "picking-diproses": {
    label: "Pengambilan - Sedang Diproses",
    className:
      "text-indigo-700 bg-indigo-50 border-indigo-300 dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-500/20",
  },
  picked: {
    label: "Pengambilan - Selesai",
    className:
      "text-cyan-700 bg-cyan-50 border-cyan-300 dark:text-cyan-300 dark:bg-cyan-500/10 dark:border-cyan-500/20",
  },
  "finish-pick": {
    label: "Pengambilan - Selesai",
    className:
      "text-cyan-700 bg-cyan-50 border-cyan-300 dark:text-cyan-300 dark:bg-cyan-500/10 dark:border-cyan-500/20",
  },
  "on-packing": {
    label: "Pengepakan - Sedang Diproses",
    className:
      "text-purple-700 bg-purple-50 border-purple-300 dark:text-purple-300 dark:bg-purple-500/10 dark:border-purple-500/20",
  },
  "packing-diproses": {
    label: "Pengepakan - Sedang Diproses",
    className:
      "text-purple-700 bg-purple-50 border-purple-300 dark:text-purple-300 dark:bg-purple-500/10 dark:border-purple-500/20",
  },
  packed: {
    label: "Pengepakan - Selesai",
    className:
      "text-purple-700 bg-purple-50 border-purple-300 dark:text-purple-300 dark:bg-purple-500/10 dark:border-purple-500/20",
  },
  "finish-pack": {
    label: "Pengepakan - Selesai",
    className:
      "text-purple-700 bg-purple-50 border-purple-300 dark:text-purple-300 dark:bg-purple-500/10 dark:border-purple-500/20",
  },
  "ready-to-ship": {
    label: "Pengiriman - Siap Dikirim",
    className:
      "text-purple-700 bg-purple-50 border-purple-300 dark:text-purple-300 dark:bg-purple-500/10 dark:border-purple-500/20",
  },
  shipped: {
    label: "Pengiriman - Sedang Dikirim",
    className:
      "text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20",
  },
  "in-transit": {
    label: "Pengiriman - Sedang Dikirim",
    className:
      "text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20",
  },
  completed: {
    label: "Selesai",
    className:
      "text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20",
  },
  delivered: {
    label: "Selesai",
    className:
      "text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20",
  },
  cancelled: {
    label: "Dibatalkan",
    className:
      "text-rose-700 bg-rose-50 border-rose-300 dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-500/20",
  },
};

export const TABS_WITH_ACTIONS: Set<OrderTab> = new Set([
  "all",
  "ready-to-process",
  "in-transit",
  "completed",
  "empty-stock",
  "failed-pick",
  "cancellation",
  "channel-cancel",
  "returned",
]);

export const CHANNEL_MAP: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  tiktok: {
    label: "TikTok",
    color: "#000000",
    icon: "/channels/tiktok.svg",
  },
  shopee: {
    label: "Shopee",
    color: "#EE4D2D",
    icon: "/channels/shopee.svg",
  },
  tokopedia: {
    label: "Tokopedia",
    color: "#42B549",
    icon: "/channels/tokopedia.svg",
  },
  lazada: {
    label: "Lazada",
    color: "#0F146D",
    icon: "/channels/lazada.svg",
  },
  woocommerce: {
    label: "WooCommerce",
    color: "#7f54b3",
    icon: "/channels/woocommerce.svg",
  },
};

export function orderChannelKey(
  source: string | null,
  commercePlatform?: string | null,
): string | null {
  if (commercePlatform?.toUpperCase() === "TOKOPEDIA") return "tokopedia";
  return source?.toLowerCase() ?? null;
}
