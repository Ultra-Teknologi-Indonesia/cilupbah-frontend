import { fetchClient, fetchBlobRaw, fetchBlobPost } from "@/lib/api-client";
import type { ApiResponse, ApiPaginated } from "@/types/api.types";
import type {
  StockAdjustment,
  StockAdjustmentItem,
  StockAdjustmentListParams,
  StockAdjustmentFormData,
  StockAdjustmentPatchData,
} from "@/types/transaksi-stok/stock-adjustment";

const BASE = "/inventory/adjustments/documents";

export interface BulkDeleteResult {
  deleted: number;
  failed: Array<{ id: string; reason: string }>;
}

export const StockAdjustmentService = {
  list: async (params: StockAdjustmentListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.search) sp.set("search", params.search);
    if (params.page) sp.set("page", String(params.page));
    if (params.per_page) sp.set("per_page", String(params.per_page));
    if (params["filter[location_id]"])
      sp.set("filter[location_id]", params["filter[location_id]"]);
    if (params["filter[date_from]"])
      sp.set("filter[date_from]", params["filter[date_from]"]);
    if (params["filter[date_to]"])
      sp.set("filter[date_to]", params["filter[date_to]"]);
    if (params.sort) sp.set("sort", params.sort);

    const res = await fetchClient<ApiPaginated<StockAdjustment>>(
      `${BASE}?${sp}`,
    );
    return { items: res.data ?? [], meta: res.meta };
  },

  getById: async (id: string) => {
    const res = await fetchClient<ApiResponse<StockAdjustment>>(
      `${BASE}/${id}`,
    );
    return res.data;
  },

  getItems: async (id: string, params: StockAdjustmentListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.search) sp.set("search", params.search);
    if (params.page) sp.set("page", String(params.page));
    if (params.per_page) sp.set("per_page", String(params.per_page));
    if (params.sort) sp.set("sort", params.sort);

    const res = await fetchClient<ApiPaginated<StockAdjustmentItem>>(
      `${BASE}/${id}/items?${sp}`,
    );
    return { items: res.data ?? [], meta: res.meta };
  },

  create: async (data: StockAdjustmentFormData) => {
    const res = await fetchClient<ApiResponse<StockAdjustment>>(BASE, {
      method: "POST",
      data,
    });
    return res.data;
  },

  update: async (id: string, data: StockAdjustmentFormData) => {
    const res = await fetchClient<ApiResponse<StockAdjustment>>(
      `${BASE}/${id}`,
      {
        method: "PUT",
        data,
      },
    );
    return res.data;
  },

  patch: async (id: string, data: StockAdjustmentPatchData) => {
    const res = await fetchClient<ApiResponse<StockAdjustment>>(
      `${BASE}/${id}`,
      {
        method: "PATCH",
        data,
      },
    );
    return res.data;
  },

  delete: async (id: string) => {
    await fetchClient(`${BASE}/${id}`, { method: "DELETE" });
  },

  pdf: async (id: string): Promise<Blob> => {
    return fetchBlobRaw(
      `${BASE}/${encodeURIComponent(id)}/pdf`,
      "application/pdf",
    );
  },

  bulkPdf: async (ids: string[]): Promise<Blob> => {
    return fetchBlobPost(`${BASE}/bulk/pdf`, { ids }, "application/pdf");
  },

  bulkPdfAsync: async (ids: string[]) => {
    const res = await fetchClient<ApiResponse<{ export_id: string; status: string; total: number }>>(
      `${BASE}/bulk/pdf/async`,
      { method: "POST", data: { ids } },
    );
    return res.data;
  },

  bulkDelete: async (ids: string[]): Promise<BulkDeleteResult> => {
    const res = await fetchClient<ApiResponse<BulkDeleteResult>>(
      `${BASE}/bulk/delete`,
      { method: "POST", data: { ids } },
    );
    return res.data;
  },

  exportXlsx: async (params: StockAdjustmentListParams = {}): Promise<string> => {
    const sp = new URLSearchParams();
    if (params.search) sp.set("search", params.search);
    if (params["filter[location_id]"])
      sp.set("filter[location_id]", params["filter[location_id]"]);
    if (params["filter[date_from]"])
      sp.set("filter[date_from]", params["filter[date_from]"]);
    if (params["filter[date_to]"])
      sp.set("filter[date_to]", params["filter[date_to]"]);

    const res = await fetchClient<ApiResponse<{ export_id: string }>>(
      `${BASE}/export/xlsx/async?${sp}`,
    );
    return res.data.export_id;
  },
};
