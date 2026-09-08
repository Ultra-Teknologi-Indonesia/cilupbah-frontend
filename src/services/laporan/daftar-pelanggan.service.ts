import { fetchClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api.types";
import type { SalesListParams } from "@/types/laporan/laporan-penjualan";

export const DaftarPelangganService = {
  exportCustomerList: async (
    params: Pick<SalesListParams, "from" | "to" | "format">,
  ): Promise<string> => {
    const sp = new URLSearchParams();
    sp.set("from", params.from);
    sp.set("to", params.to);
    sp.set("format", params.format ?? "excel");

    const response = await fetchClient<ApiResponse<{ export_id: string }>>(
      `/reports/sales/customer/export/async?${sp.toString()}`,
    );
    return response.data.export_id;
  },
};
