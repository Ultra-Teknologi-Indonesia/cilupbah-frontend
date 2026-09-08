import { fetchClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api.types";
import type { RincianPendapatanParams } from "@/types/laporan/rincian-pendapatan";

export const RincianPendapatanService = {
  exportRincianPendapatan: async (
    params: RincianPendapatanParams,
  ): Promise<string> => {
    const sp = new URLSearchParams();
    sp.set("jenis", params.jenis);
    sp.set("from", params.from);
    sp.set("to", params.to);
    sp.set("format", params.format ?? "excel");
    params.item_ids?.forEach((id) => sp.append("item_ids[]", id));

    const response = await fetchClient<ApiResponse<{ export_id: string }>>(
      `/reports/sales/income/export/async?${sp.toString()}`,
    );
    return response.data.export_id;
  },
};
