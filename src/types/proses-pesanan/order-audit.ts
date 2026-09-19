export type OrderAuditWebhookState =
  | "waiting"
  | "queued"
  | "success"
  | "failed"
  | "skipped"
  | "unknown";

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
