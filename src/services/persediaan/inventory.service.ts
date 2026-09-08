import { fetchClient } from "@/lib/api-client";
import type { ApiPaginated, ApiResponse } from "@/types/api.types";
import type {
  StockItem,
  StockListParams,
  StockMovement,
  StockMovementParams,
  BinInventory,
  StockListMeta,
  MovementFilterOptions,
} from "@/types/persediaan/stock";

interface StockListResponse extends ApiResponse<StockItem[]> {
  meta: StockListMeta;
}

export const InventoryStockService = {
  exportReport: async (params: {
    report_type: "by_location" | "as_of_date" | "by_rack";
    item_ids?: string[];
    location_ids?: string[];
    location_id?: string;
    as_of_date?: string;
    stock_filter?: "all" | "positive" | "zero";
    only_not_restocked?: boolean;
    only_with_stock?: boolean;
    format?: "excel" | "pdf";
  }): Promise<string> => {
    const res = await fetchClient<
      ApiResponse<{ export_id: string; status: string }>
    >(`/reports/inventory/stock/export/async`, {
      method: "POST",
      data: params,
    });

    return res.data.export_id;
  },

  list: (params: StockListParams) => {
    const sp = new URLSearchParams();
    if (params.search) sp.set("search", params.search);
    if (params.page) sp.set("page", String(params.page));
    if (params.per_page) sp.set("per_page", String(params.per_page));
    if (params["filter[product_id]"])
      sp.set("filter[product_id]", params["filter[product_id]"]);
    if (params["filter[location_id]"])
      sp.set("filter[location_id]", params["filter[location_id]"]);
    if (params["filter[is_bundle]"])
      sp.set("filter[is_bundle]", params["filter[is_bundle]"]);
    if (params["filter[channel]"])
      sp.set("filter[channel]", params["filter[channel]"]);
    if (params.sort) sp.set("sort", params.sort);

    return fetchClient<StockListResponse>(`/inventory?${sp}`);
  },

  movements: (params: StockMovementParams) => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      sp.set(key, String(value));
    }

    return fetchClient<ApiPaginated<StockMovement>>(`/inventory/history?${sp}`);
  },

  getItem: (itemId: string) => {
    return fetchClient<ApiResponse<StockItem>>(`/inventory/${itemId}`);
  },

  getItemStock: (itemId: string) => {
    return fetchClient<ApiResponse<BinInventory[]>>(
      `/inventory/stocks/${itemId}`,
    );
  },

  movementFilters: () => {
    return fetchClient<ApiResponse<MovementFilterOptions>>(
      `/inventory/movement-filters`,
    );
  },

  stockedItems: (params: {
    locationId: string;
    search?: string;
    page?: number;
    perPage?: number;
    includeZero?: boolean;
  }) => {
    const q = new URLSearchParams();
    q.set("location_id", params.locationId);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    q.set("per_page", String(params.perPage ?? 20));
    if (params.includeZero) q.set("include_zero", "1");
    return fetchClient<
      ApiPaginated<{
        item_id: string;
        sku: string;
        product_name: string | null;
        variant_label: string;
        thumbnail_url: string | null;
        total_on_hand: number;
        sell_price: number;
        item_code?: string;
        item_name?: string | null;
        item_group_id?: string;
        is_bundle?: boolean;
        sell_unit?: string;
        available_qty?: number;
        variant?: unknown | null;
      }>
    >(`/inventory/stock/items?${q.toString()}`);
  },

  aggregatedStocksByIds: (ids: string[]) => {
    return fetchClient<
      ApiResponse<
        {
          item_id: string;
          location_id: string;
          total_on_hand: number;
          total_reserved: number;
          total_available: number;
          location: {
            id: string;
            location_code: string;
            location_name: string;
            is_small_warehouse?: boolean;
          } | null;
        }[]
      >
    >(`/inventory/items/all-stocks`, {
      method: "POST",
      data: { ids },
    });
  },

  bySku: (
    sku: string,
    locationId?: string,
    opts?: { requireStock?: boolean; strategy?: "default" | "fifo" },
  ) => {
    const params = new URLSearchParams();
    if (locationId) params.set("location_id", locationId);
    if (opts?.requireStock) params.set("require_stock", "1");
    if (opts?.strategy === "fifo") params.set("strategy", "fifo");
    const qs = params.toString() ? `?${params.toString()}` : "";
    return fetchClient<
      ApiResponse<{
        id: string;
        sku: string;
        product_id: string | null;
        product_name: string | null;
        variant_label: string;
        thumbnail_url: string | null;
        on_hand: number;
        avg_cost: number;
        primary_bin: {
          id: string;
          code: string;
          on_hand: number;
          avg_cost: number;
        } | null;
        available_bins: {
          id: string;
          code: string;
          on_hand: number;
          avg_cost: number;
        }[];
      }>
    >(`/inventory/stock/by-sku/${encodeURIComponent(sku)}${qs}`);
  },
};
