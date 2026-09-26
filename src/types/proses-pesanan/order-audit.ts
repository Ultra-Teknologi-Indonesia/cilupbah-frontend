export type OrderAuditWebhookState =
  | "waiting"
  | "queued"
  | "success"
  | "failed"
  | "skipped"
  | "unknown";

export interface OrderAuditShop {
  id: string;
  shopId: string;
  shopName: string;
  channel: "shopee" | "tiktok" | "lazada" | "woocommerce" | string;
  channelName: string;
}

export interface RawOrderAuditShop {
  id: string;
  shop_id: string;
  shop_name: string;
  channel: string;
  channel_name: string;
}

export interface RawOrderAuditWebhook {
  id: string;
  channel: string;
  shop_id: string;
  location_code: string;
  event_type: string;
  status: string;
  processing_state: OrderAuditWebhookState;
  attempts: number;
  error?: string | null;
  received_at?: string | null;
  processed_at?: string | null;
  next_attempt_at?: string | null;
  order_sync_enabled?: boolean | null;
  replayable: boolean;
}

export interface RawOrderAuditOrder {
  id: string;
  internal_order_no: string;
  channel_order_no?: string | null;
  source?: string | null;
  location_code?: string | null;
  location_name?: string | null;
  internal_status?: string | null;
  wms_status?: string | null;
  channel_status?: string | null;
  channel_status_raw?: string | null;
  channel_fulfillment_status?: string | null;
  is_canceled: boolean;
  handed_to_warehouse_at?: string | null;
  created_at?: string | null;
  transaction_date?: string | null;
  channel?: string | null;
  shop_id?: string | null;
  shop_name?: string | null;
  channel_active?: boolean | null;
  order_sync_enabled?: boolean | null;
  channel_disconnected_at?: string | null;
  processed: boolean;
  child_counts: Record<string, number>;
  can_delete: boolean;
}

export interface RawOrderAudit {
  reference: string;
  found_in_wms: boolean;
  orders: RawOrderAuditOrder[];
  webhooks: RawOrderAuditWebhook[];
  actions: {
    can_include: boolean;
    can_delete: boolean;
  };
}

export interface OrderAuditWebhook extends Omit<RawOrderAuditWebhook, "shop_id"> {
  shopId: string;
  locationCode: string;
}

export interface OrderAuditOrder extends Omit<RawOrderAuditOrder, "internal_order_no" | "channel_order_no" | "location_code" | "location_name" | "internal_status" | "wms_status" | "channel_status" | "channel_fulfillment_status" | "child_counts" | "shop_id" | "shop_name"> {
  internalOrderNo: string;
  channelOrderNo: string | null;
  locationCode: string | null;
  locationName: string | null;
  internalStatus: string | null;
  wmsStatus: string | null;
  channelStatus: string | null;
  channelFulfillmentStatus: string | null;
  shopId: string | null;
  shopName: string | null;
  childCounts: Record<string, number>;
}

export interface OrderAudit {
  reference: string;
  foundInWms: boolean;
  orders: OrderAuditOrder[];
  webhooks: OrderAuditWebhook[];
  actions: {
    canInclude: boolean;
    canDelete: boolean;
  };
}

export type OrderAuditMatchState = "match" | "missing" | "status_mismatch";

export interface RawOrderAuditReportSummary {
  marketplace_total: number;
  wms_total: number;
  matched_total: number;
  missing_total: number;
  status_mismatch_total: number;
  last_sync_at?: string | null;
  last_checked_at: string;
}

export interface RawOrderAuditReportRow {
  id: string;
  channel: string;
  shop_id?: string | null;
  shop_name?: string | null;
  order_reference: string;
  marketplace_status?: string | null;
  wms_order_id?: string | null;
  internal_order_no?: string | null;
  internal_status?: string | null;
  wms_status?: string | null;
  channel_status_raw?: string | null;
  match_state: OrderAuditMatchState;
  inbox_status: string;
  attempts: number;
  error?: string | null;
  latest_received_at?: string | null;
  wms_transaction_date?: string | null;
  wms_updated_at?: string | null;
}

export interface RawOrderAuditReport {
  summary: RawOrderAuditReportSummary;
  items: RawOrderAuditReportRow[];
}

export interface OrderAuditReportSummary {
  marketplaceTotal: number;
  wmsTotal: number;
  matchedTotal: number;
  missingTotal: number;
  statusMismatchTotal: number;
  lastSyncAt: string | null;
  lastCheckedAt: string;
}

export interface OrderAuditReportRow extends RawOrderAuditReportRow {
  shopId: string | null;
  shopName: string | null;
  orderReference: string;
  marketplaceStatus: string | null;
  wmsOrderId: string | null;
  internalOrderNo: string | null;
  internalStatus: string | null;
  wmsStatus: string | null;
  channelStatusRaw: string | null;
  latestReceivedAt: string | null;
  wmsTransactionDate: string | null;
  wmsUpdatedAt: string | null;
}

export interface OrderAuditReport {
  summary: OrderAuditReportSummary;
  items: OrderAuditReportRow[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
