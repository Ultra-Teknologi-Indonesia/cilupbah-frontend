export type ChannelCode =
  | "tiktok"
  | "lazada"
  | "shopee"
  | "woocommerce"
  | "tokopedia"
  | "blibli"
  | (string & {});

export type IntegrationStatus = "normal" | "warning" | "error";

export type ChannelStoreAction = "reauth";

export interface StoreIntegration {
  status: IntegrationStatus;

  note?: string;
  action?: ChannelStoreAction | null;
}

export type OrderSyncStatus = "normal" | "pending" | "problem" | "nonaktif";

export interface OrderSyncInfo {
  status: OrderSyncStatus;
  note?: string | null;
  action?: ChannelStoreAction | null;
}

export interface ConnectedStore {
  id: string;
  shopId: string;
  shopName: string;

  channel: { code: ChannelCode; name: string };
  isActive: boolean;
  ordersEnabled: boolean;
  isShadowMode: boolean;
  catalogPullEnabled: boolean;
  catalogPushEnabled: boolean;
  stockPushEnabled: boolean;
  pricePushEnabled: boolean;
  fulfillmentPushEnabled: boolean;
  handoverMethod: HandoverMethod;
  integration: StoreIntegration;
  orderSync: OrderSyncInfo;
  lastOrderSyncedAt: string | null;

  linkedStore?: { code: ChannelCode; name: string };
  connectedAt: string;
}

export interface StoreFlags {
  is_active?: boolean;
  order_sync_enabled?: boolean;
  is_shadow_mode?: boolean;
  catalog_pull_enabled?: boolean;
  catalog_push_enabled?: boolean;
  stock_push_enabled?: boolean;
  price_push_enabled?: boolean;
  fulfillment_push_enabled?: boolean;
  handover_method?: HandoverMethod;
  stock_source_mode?: StockSourceMode;
  location_id?: string | null;
}

export interface ChannelGroup {
  id: string;
  code: ChannelCode;
  name: string;

  connectable: boolean;
  stores: ConnectedStore[];
}

export interface Channel {
  id: string;
  code: ChannelCode;
  name: string;
  connectable: boolean;
}

export interface RawConnectedStore {
  id: string;
  shop_id: string;
  shop_name: string;
  is_active: boolean;
  order_sync_enabled: boolean;
  is_shadow_mode: boolean;
  shadow_started_at: string | null;
  shadow_last_pulled_at: string | null;
  stock_push_enabled: boolean;
  price_push_enabled: boolean;
  stock_push_buffer: number;
  stock_handover_at: string | null;
  fulfillment_push_enabled: boolean;
  fulfillment_handover_at: string | null;
  handover_method: HandoverMethod;
  catalog_pull_enabled: boolean;
  catalog_push_enabled: boolean;
  integration: {
    status: IntegrationStatus;
    note?: string;
    action?: ChannelStoreAction | null;
  };
  order_sync: {
    status: OrderSyncStatus;
    note?: string | null;
    action?: ChannelStoreAction | null;
  };
  last_order_synced_at: string | null;
  token_expires_at: string | null;
  channel: { id: string; code: string; name: string } | null;
  created_at: string;
}

export interface RawChannel {
  id: string;
  code: string;
  name: string;
}

export type StockSourceMode = "total" | "location";

/**
 * Cara paket diserahkan ke kurir. Hanya berlaku sebagai preferensi saat
 * marketplace menawarkan lebih dari satu pilihan; kalau marketplace cuma
 * menawarkan satu, sistem selalu ikut marketplace.
 */
export type HandoverMethod = "dropoff" | "pickup";

export interface StockAllocationStore {
  storeId: string;
  channelCode: ChannelCode;
  channelName: string;
  storeName: string;
  fullStoreName: string;
  stockSourceMode: StockSourceMode;
  locationId: string | null;
  locationName: string | null;
  locationCode: string | null;
}

export interface RawStockAllocationStore {
  store_id: string;
  channel_code: string;
  channel_name: string;
  store_name: string;
  full_store_name: string;
  stock_source_mode: StockSourceMode;
  location_id: string | null;
  location_name: string | null;
  location_code: string | null;
}
