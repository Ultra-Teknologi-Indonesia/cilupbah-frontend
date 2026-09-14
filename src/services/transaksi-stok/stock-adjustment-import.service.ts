import { fetchBlob, fetchClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api.types";
import type {
  ImportPreviewResponse,
  ImportConfirmPayload,
  ImportPreviewQuery,
} from "@/types/transaksi-stok/stock-adjustment-import";
import type { StockAdjustment } from "@/types/transaksi-stok/stock-adjustment";

export const StockAdjustmentImportService = {
  downloadTemplate: () =>
    fetchBlob(
      "/inventory/adjustments/import/template",
      "template-import-penyesuaian-stok.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ),

  preview: (file: File, locationId: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("location_id", locationId);
    return fetchClient<ApiResponse<ImportPreviewResponse>>(
      "/inventory/adjustments/import/preview",
      {
        method: "POST",
        data: form,

        headers: { "Content-Type": undefined as unknown as string },
      },
    );
  },

  previewPage: (token: string, query: ImportPreviewQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page !== undefined) params.set("page", String(query.page));
    if (query.per_page !== undefined) {
      params.set("per_page", String(query.per_page));
    }
    if (query.search?.trim()) params.set("search", query.search.trim());
    if (query.sort?.trim()) params.set("sort", query.sort.trim());

    const suffix = params.toString() ? `?${params.toString()}` : "";
    return fetchClient<ApiResponse<ImportPreviewResponse>>(
      `/inventory/adjustments/import/preview/${encodeURIComponent(token)}${suffix}`,
    );
  },

  confirm: (payload: ImportConfirmPayload) => {
    return fetchClient<ApiResponse<StockAdjustment>>(
      "/inventory/adjustments/import/confirm",
      {
        method: "POST",
        data: payload,
      },
    );
  },
};
