import { fetchClient } from "@/lib/api-client";
import type { ApiPaginated, ApiResponse } from "@/types/api.types";
import type {
  AcceptReplenishmentPayload,
  StockReplenishment,
  StockReplenishmentListParams,
  UpdateReplenishmentItemPayload,
  QueueFromMonitorPayload,
  StockReplenishmentItemFilters,
  StockReplenishmentItem,
  StockReplenishmentItemsParams,
} from "@/types/gudang/stock-replenishment";

interface ListResponse {
  items: StockReplenishment[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const StockReplenishmentService = {
  list: async (
    params: StockReplenishmentListParams = {},
  ): Promise<ListResponse> => {
    const res = await fetchClient<ApiPaginated<StockReplenishment>>(
      "/inventory/stock-replenishment",
      {
        method: "GET",
        params: params as Record<string, string | number | undefined>,
      },
    );
    return {
      items: res.data ?? [],
      meta: res.meta ?? {
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 0,
      },
    };
  },

  detail: async (id: string) => {
    const res = await fetchClient<ApiResponse<StockReplenishment>>(
      `/inventory/stock-replenishment/${id}`,
      { method: "GET" },
    );
    return res.data;
  },

  items: async (id: string, params: StockReplenishmentItemsParams = {}) => {
    const res = await fetchClient<ApiPaginated<StockReplenishmentItem>>(
      `/inventory/stock-replenishment/${id}/items`,
      {
        method: "GET",
        params: params as Record<string, string | number | undefined>,
      },
    );
    return { items: res.data ?? [], meta: res.meta };
  },

  itemFilters: async (id: string) => {
    const res = await fetchClient<ApiResponse<StockReplenishmentItemFilters>>(
      `/inventory/stock-replenishment/${id}/item-filters`,
      { method: "GET" },
    );
    return res.data;
  },

  pendingCount: async () => {
    const res = await fetchClient<ApiResponse<{ count: number }>>(
      "/inventory/stock-replenishment/pending-count",
      { method: "GET" },
    );
    return res.data.count;
  },

  queueFromMonitor: async (payload: QueueFromMonitorPayload) => {
    const res = await fetchClient<
      ApiResponse<{
        request: StockReplenishment | null;
        queued_item_ids: string[];
        skipped_item_ids: string[];
      }>
    >("/inventory/stock-replenishment/queue", {
      method: "POST",
      data: payload,
    });
    return res.data;
  },

  accept: async (id: string, payload: AcceptReplenishmentPayload) => {
    const res = await fetchClient<ApiResponse<StockReplenishment>>(
      `/inventory/stock-replenishment/${id}/accept`,
      { method: "POST", data: payload },
    );
    return res.data;
  },

  reject: async (id: string, reason?: string) => {
    const res = await fetchClient<ApiResponse<StockReplenishment>>(
      `/inventory/stock-replenishment/${id}/reject`,
      { method: "POST", data: { reason } },
    );
    return res.data;
  },

  updateItem: async (
    id: string,
    itemId: string,
    payload: UpdateReplenishmentItemPayload,
  ) => {
    const res = await fetchClient<ApiResponse<StockReplenishment>>(
      `/inventory/stock-replenishment/${id}/items/${itemId}`,
      { method: "PATCH", data: payload },
    );
    return res.data;
  },

  removeItem: async (id: string, itemId: string) => {
    const res = await fetchClient<ApiResponse<StockReplenishment>>(
      `/inventory/stock-replenishment/${id}/items/${itemId}`,
      { method: "DELETE" },
    );
    return res.data;
  },
};
