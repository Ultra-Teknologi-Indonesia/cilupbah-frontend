import { fetchClient } from "@/lib/api-client";
import type { ApiResponse, ApiPaginated } from "@/types/api.types";
import type {
  ChannelCode,
  PrintLabelCapabilities,
  RawConnectedStore,
  RawStockAllocationStore,
  StockAllocationStore,
  StoreFlags,
} from "@/types/channel";

export type { StoreFlags };

export interface ChannelSyncSetting {
  sync_enabled: boolean;
  paused_at: string | null;
  resumed_at: string | null;
  pause_reason: "manual" | "auto_schedule" | null;
  auto_pause_at: string;
  auto_pause_timezone: string;
  auto_pause_due: boolean;
}

export interface StockAllocationParams {
  page?: number;
  perPage?: number;
}

export interface StockAllocationListResult {
  items: StockAllocationStore[];
  meta: ApiPaginated<RawStockAllocationStore>["meta"];
}

function mapStockAllocationStore(
  raw: RawStockAllocationStore,
): StockAllocationStore {
  return {
    storeId: raw.store_id,
    channelCode: raw.channel_code as ChannelCode,
    channelName: raw.channel_name,
    storeName: raw.store_name,
    fullStoreName: raw.full_store_name,
    stockSourceMode: raw.stock_source_mode,
    locationId: raw.location_id,
    locationName: raw.location_name,
    locationCode: raw.location_code,
  };
}

export const ChannelService = {
  listStores: async (): Promise<RawConnectedStore[]> => {
    const res = await fetchClient<ApiPaginated<RawConnectedStore>>(
      "/marketplace/store?per_page=200",
    );
    return res.data ?? [];
  },

  getAuthUrl: async (channel: ChannelCode): Promise<string> => {
    const res = await fetchClient<ApiResponse<{ auth_url: string }>>(
      `/${channel}/auth`,
    );
    return res.data.auth_url;
  },

  getWooAuthUrl: async (storeUrl: string): Promise<string> => {
    const res = await fetchClient<ApiResponse<{ auth_url: string }>>(
      `/woocommerce/auth?store_url=${encodeURIComponent(storeUrl)}`,
    );
    return res.data.auth_url;
  },

  connectWooCommerce: async (payload: {
    storeUrl: string;
    consumerKey: string;
    consumerSecret: string;
    shopName?: string;
  }): Promise<RawConnectedStore> => {
    const res = await fetchClient<ApiResponse<RawConnectedStore>>(
      "/woocommerce/connect",
      {
        method: "POST",
        data: {
          store_url: payload.storeUrl,
          consumer_key: payload.consumerKey,
          consumer_secret: payload.consumerSecret,
          shop_name: payload.shopName,
        },
      },
    );
    return res.data;
  },

  setStoreFlags: async (
    id: string,
    flags: StoreFlags,
  ): Promise<RawConnectedStore> => {
    const res = await fetchClient<ApiResponse<RawConnectedStore>>(
      `/marketplace/store/${id}`,
      { method: "PATCH", data: flags },
    );
    return res.data;
  },

  listStockAllocation: async (
    params: StockAllocationParams = {},
  ): Promise<StockAllocationListResult> => {
    const q = new URLSearchParams();
    q.set("page", String(params.page ?? 1));
    q.set("per_page", String(params.perPage ?? 20));

    const res = await fetchClient<ApiPaginated<RawStockAllocationStore>>(
      `/marketplace/stock-allocation?${q.toString()}`,
    );
    return {
      items: (res.data ?? []).map(mapStockAllocationStore),
      meta: res.meta,
    };
  },

  disconnect: async (id: string): Promise<void> => {
    await fetchClient(`/marketplace/store/${id}`, { method: "DELETE" });
  },

  refreshToken: async (channel: ChannelCode, id: string): Promise<void> => {
    await fetchClient(`/${channel}/stores/${id}/refresh-token`, {
      method: "POST",
    });
  },

  getPrintLabelCapabilities: async (
    source: string,
  ): Promise<PrintLabelCapabilities> => {
    const res = await fetchClient<ApiResponse<PrintLabelCapabilities>>(
      `/channels/print-label-capabilities?source=${encodeURIComponent(source)}`,
    );
    return res.data;
  },

  getSyncSetting: async (): Promise<ChannelSyncSetting> => {
    const res = await fetchClient<ApiResponse<ChannelSyncSetting>>(
      "/channel-sync-setting",
    );
    return res.data;
  },

  setSyncSetting: async (enabled: boolean): Promise<ChannelSyncSetting> => {
    const res = await fetchClient<ApiResponse<ChannelSyncSetting>>(
      "/channel-sync-setting",
      { method: "PUT", data: { sync_enabled: enabled } },
    );
    return res.data;
  },
};
