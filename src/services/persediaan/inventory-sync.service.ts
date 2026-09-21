import { fetchClient } from "@/lib/api-client";
import type { ApiPaginated, ApiResponse } from "@/types/api.types";
import type { ChannelCode } from "@/types/channel";

export type StockPushStatus =
  | "idle"
  | "processing"
  | "success"
  | "failed"
  | "skipped";

export interface StockSyncState {
  status: StockPushStatus;
  outboxStatus: string | null;
  lastError: string | null;
  attemptCount: number;
  nextAttemptAt: string | null;
  updatedAt: string | null;
}

export interface InternalStock {
  onHand: number;
  onOrder: number;
  available: number;
}

export interface SyncStoreCell {
  mappingId: string;
  channelShopId: string;
  hasListing: boolean;
  syncEnabled: boolean;
  externalSkuId: string | null;
  syncStatus: string | null;
  stockSync: StockSyncState;
}

export interface SyncVariationValue {
  label: string | null;
  value: string;
}

export interface SyncMatrixRow {
  itemId: string;
  itemCode: string;
  itemName: string | null;
  itemGroupId: string | null;
  isBundle: boolean;
  variationValues: SyncVariationValue[];
  thumbnail: string | null;
  internalStock: InternalStock;
  stores: SyncStoreCell[];
}

export interface SyncStoreColumn {
  channelShopId: string;
  shopName: string | null;
  channelCode: ChannelCode;
}

export interface SyncMatrixMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  storesCatalog: SyncStoreColumn[];
}

export interface SyncMatrixParams {
  search?: string;
  channelCode?: string;
  channelShopId?: string;
  page?: number;
  perPage?: number;
}

export interface SyncMatrixResult {
  rows: SyncMatrixRow[];
  meta: SyncMatrixMeta;
}

export interface SyncToggleItem {
  variantId: string;
  channelShopId: string;
  syncEnabled: boolean;
}

export interface SyncBulkToggleInput {
  syncEnabled: boolean;
  channelShopId?: string | null;
  search?: string;
  channelCode?: string;
}

interface RawStoreCell {
  mapping_id: string;
  channel_shop_id: string;
  has_listing: boolean;
  sync_enabled: boolean;
  external_sku_id: string | null;
  sync_status: string | null;
  stock_sync?: {
    status?: StockPushStatus;
    outbox_status?: string | null;
    last_error?: string | null;
    attempt_count?: number;
    next_attempt_at?: string | null;
    updated_at?: string | null;
  };
}

interface RawMatrixRow {
  item_id: string;
  item_code: string;
  item_name: string | null;
  item_group_id: string | null;
  is_bundle: boolean;
  variation_values: SyncVariationValue[];
  thumbnail: string | null;
  internal_stock?: {
    on_hand?: number;
    on_order?: number;
    available?: number;
  };
  stores: RawStoreCell[];
}

interface RawStoreColumn {
  channel_shop_id: string;
  shop_name: string | null;
  channel_code: string | null;
}

interface RawMatrixMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  stores_catalog: RawStoreColumn[];
}

type RawMatrixResponse = ApiResponse<RawMatrixRow[]> & { meta: RawMatrixMeta };

function mapRow(raw: RawMatrixRow): SyncMatrixRow {
  return {
    itemId: raw.item_id,
    itemCode: raw.item_code,
    itemName: raw.item_name,
    itemGroupId: raw.item_group_id,
    isBundle: raw.is_bundle,
    variationValues: raw.variation_values ?? [],
    thumbnail: raw.thumbnail,
    internalStock: {
      onHand: raw.internal_stock?.on_hand ?? 0,
      onOrder: raw.internal_stock?.on_order ?? 0,
      available: raw.internal_stock?.available ?? 0,
    },
    stores: (raw.stores ?? []).map((s) => ({
      mappingId: s.mapping_id,
      channelShopId: s.channel_shop_id,
      hasListing: s.has_listing,
      syncEnabled: s.sync_enabled,
      externalSkuId: s.external_sku_id,
      syncStatus: s.sync_status,
      stockSync: {
        status: s.stock_sync?.status ?? "idle",
        outboxStatus: s.stock_sync?.outbox_status ?? null,
        lastError: s.stock_sync?.last_error ?? null,
        attemptCount: s.stock_sync?.attempt_count ?? 0,
        nextAttemptAt: s.stock_sync?.next_attempt_at ?? null,
        updatedAt: s.stock_sync?.updated_at ?? null,
      },
    })),
  };
}

export interface StockSyncHistoryItem {
  id: string;
  status: "success" | "failed" | "pending" | "skipped";
  errorMessage: string | null;
  createdAt: string;
  response: Record<string, unknown> | null;
}

interface RawStockSyncHistoryItem {
  id: string;
  status: StockSyncHistoryItem["status"];
  error_message: string | null;
  created_at: string;
  response: Record<string, unknown> | null;
}

export const InventorySyncService = {
  list: async (params: SyncMatrixParams = {}): Promise<SyncMatrixResult> => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.channelCode) q.set("filter[channel_code]", params.channelCode);
    if (params.channelShopId) q.set("filter[channel_shop_id]", params.channelShopId);
    q.set("page", String(params.page ?? 1));
    q.set("per_page", String(params.perPage ?? 20));

    const res = await fetchClient<RawMatrixResponse>(
      `/inventory/sync-settings?${q.toString()}`,
    );

    return {
      rows: (res.data ?? []).map(mapRow),
      meta: {
        currentPage: res.meta.current_page,
        lastPage: res.meta.last_page,
        perPage: res.meta.per_page,
        total: res.meta.total,
        storesCatalog: (res.meta.stores_catalog ?? []).map((s) => ({
          channelShopId: s.channel_shop_id,
          shopName: s.shop_name,
          channelCode: (s.channel_code ?? "") as ChannelCode,
        })),
      },
    };
  },

  toggle: async (items: SyncToggleItem[]): Promise<number> => {
    const res = await fetchClient<ApiResponse<{ affected: number }>>(
      `/inventory/sync-settings`,
      {
        method: "PATCH",
        data: {
          items: items.map((i) => ({
            variant_id: i.variantId,
            channel_shop_id: i.channelShopId,
            sync_enabled: i.syncEnabled,
          })),
        },
      },
    );
    return res.data.affected;
  },

  bulkToggle: async (input: SyncBulkToggleInput): Promise<number> => {
    const res = await fetchClient<ApiResponse<{ affected: number }>>(
      `/inventory/sync-settings/bulk`,
      {
        method: "POST",
        data: {
          sync_enabled: input.syncEnabled,
          channel_shop_id: input.channelShopId ?? null,
          search: input.search,
          channel_code: input.channelCode,
        },
      },
    );
    return res.data.affected;
  },

  retry: async (
    mappingId: string,
  ): Promise<ApiResponse<{ mapping_id: string; outbox_id: string; status: string }>> =>
    fetchClient<ApiResponse<{ mapping_id: string; outbox_id: string; status: string }>>(
      "/inventory/sync-settings/retry",
      {
        method: "POST",
        data: { mapping_id: mappingId },
      },
    ),

  history: async (
    mappingId: string,
    perPage = 10,
  ): Promise<{ items: StockSyncHistoryItem[]; meta: ApiPaginated<RawStockSyncHistoryItem>["meta"] }> => {
    const res = await fetchClient<ApiPaginated<RawStockSyncHistoryItem>>(
      "/inventory/sync-settings/" + mappingId + "/history?per_page=" + perPage,
    );

    return {
      items: (res.data ?? []).map((item) => ({
        id: item.id,
        status: item.status,
        errorMessage: item.error_message,
        createdAt: item.created_at,
        response: item.response,
      })),
      meta: res.meta,
    };
  },
};
