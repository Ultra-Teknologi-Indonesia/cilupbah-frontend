import { fetchClient } from "@/lib/api-client";
import type { ApiPaginated, ApiResponse } from "@/types/api.types";
import type {
  SalesProductParams,
  SkuOption,
} from "@/types/laporan/laporan-produk";

export const LaporanProdukService = {
  exportSalesProduct: async (params: SalesProductParams): Promise<string> => {
    const sp = new URLSearchParams();
    sp.set("from", params.from);
    sp.set("to", params.to);
    sp.set("format", params.format ?? "excel");
    params.location_ids?.forEach((id) => sp.append("location_ids[]", id));
    params.item_ids?.forEach((id) => sp.append("item_ids[]", id));

    const response = await fetchClient<ApiResponse<{ export_id: string }>>(
      `/reports/sales/product/export/async?${sp.toString()}`,
    );
    return response.data.export_id;
  },

  searchSkuOptions: async (
    search: string,
    page: number,
    perPage = 20,
  ): Promise<ApiPaginated<SkuOption>> => {
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    sp.set("page", String(page));
    sp.set("per_page", String(perPage));

    return fetchClient<ApiPaginated<SkuOption>>(
      `/reports/sales/product/sku-options?${sp.toString()}`,
    );
  },
};
