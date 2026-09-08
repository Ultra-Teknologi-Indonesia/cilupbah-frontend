import { fetchClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api.types";
import type { SalesListParams } from "@/types/laporan/laporan-penjualan";

export const LaporanReturPenjualanService = {
  exportSalesReturn: async (params: SalesListParams): Promise<string> => {
    const sp = new URLSearchParams();
    sp.set("from", params.from);
    sp.set("to", params.to);
    sp.set("format", params.format ?? "excel");
    params.location_ids?.forEach((id) => sp.append("location_ids[]", id));

    const response = await fetchClient<ApiResponse<{ export_id: string }>>(
      `/reports/sales/return/export/async?${sp.toString()}`,
    );
    return response.data.export_id;
  },
};
