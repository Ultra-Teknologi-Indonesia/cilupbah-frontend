import { fetchBlobPost, fetchBlobRaw, fetchClient } from "@/lib/api-client";
import type { ApiPaginated, ApiResponse } from "@/types/api.types";
import type { BarcodeReportParams } from "@/types/laporan/barcode";
import type { HppReportParams, HppReportPayload } from "@/types/laporan/hpp";
import type { PenyesuaianStokPdfParams } from "@/types/laporan/penyesuaian-stok";
import type {
  LaporanReturParams,
  LaporanReturRow,
} from "@/types/laporan/retur";
import type {
  SettlementListMeta,
  SettlementParams,
  SettlementRow,
  SettlementSummary,
} from "@/types/laporan/settlement";

function buildReturQuery(params: LaporanReturParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.date_from) sp.set("date_from", params.date_from);
  if (params.date_to) sp.set("date_to", params.date_to);
  if (params.location_id) sp.set("location_id", params.location_id);
  if (params.channel_shop_id) sp.set("channel_shop_id", params.channel_shop_id);
  if (params.status) sp.set("status", params.status);
  if (params.source) sp.set("source", params.source);
  if (params.reason_category) sp.set("reason_category", params.reason_category);
  if (params.marketplace_decision)
    sp.set("marketplace_decision", params.marketplace_decision);
  if (params.page) sp.set("page", String(params.page));
    if (params.per_page) sp.set("per_page", String(params.per_page));
  return sp;
}

function buildSettlementQuery(params: SettlementParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.channel) sp.set("filter[channel]", params.channel);
  if (params.channel_shop_id)
    sp.set("filter[channel_shop_id]", params.channel_shop_id);
  if (params.is_settled) sp.set("filter[is_settled]", params.is_settled);
  if (params.date_from) sp.set("filter[date_from]", params.date_from);
  if (params.date_to) sp.set("filter[date_to]", params.date_to);
  if (params.settled_from) sp.set("filter[settled_from]", params.settled_from);
  if (params.settled_to) sp.set("filter[settled_to]", params.settled_to);
  if (params.page) sp.set("page", String(params.page));
  if (params.per_page) sp.set("per_page", String(params.per_page));
  return sp;
}

interface SettlementListResponse {
  status: "success" | "error";
  message: string;
  data: SettlementRow[];
  meta: SettlementListMeta;
}

export const ReportService = {
  hpp: (params: HppReportParams) => {
    const sp = new URLSearchParams();
    sp.set("date_from", params.date_from);
    sp.set("date_to", params.date_to);
    if (params.location_id) sp.set("location_id", params.location_id);

    return fetchClient<ApiResponse<HppReportPayload>>(
      `/reports/hpp?${sp.toString()}`,
    );
  },

  retur: async (params: LaporanReturParams = {}) => {
    const sp = buildReturQuery(params);
    const res = await fetchClient<ApiPaginated<LaporanReturRow>>(
      `/sales/returns/report?${sp.toString()}`,
    );
    return { items: res.data ?? [], meta: res.meta };
  },

  returExport: async (params: LaporanReturParams = {}): Promise<Blob> => {
    const sp = buildReturQuery(params);
    return fetchBlobRaw(
      `/sales/returns/report/export?${sp.toString()}`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  },

  returExportAsync: async (
    params: LaporanReturParams = {},
  ): Promise<string> => {
    const sp = buildReturQuery(params);
    const res = await fetchClient<ApiResponse<{ export_id: string }>>(
      "/sales/returns/report/export/async?" + sp.toString(),
    );
    return res.data.export_id;
  },

  settlement: async (params: SettlementParams = {}) => {
    const sp = buildSettlementQuery(params);
    const res = await fetchClient<SettlementListResponse>(
      `/sales/settlements?${sp.toString()}`,
    );
    const meta = res.meta ?? {
      current_page: 1,
      last_page: 1,
      per_page: params.per_page ?? 20,
      total: 0,
    };
    return {
      items: res.data ?? [],
      meta,
      summary: meta.summary ?? null,
    };
  },

  settlementSummary: async (
    params: SettlementParams = {},
  ): Promise<SettlementSummary> => {
    const sp = buildSettlementQuery(params);
    const res = await fetchClient<ApiResponse<SettlementSummary>>(
      `/sales/settlements/summary?${sp.toString()}`,
    );
    return res.data;
  },

  settlementExport: async (params: SettlementParams = {}): Promise<Blob> => {
    const sp = buildSettlementQuery(params);
    return fetchBlobRaw(
      `/sales/settlements/export?${sp.toString()}`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  },

  settlementExportAsync: async (
    params: SettlementParams = {},
  ): Promise<string> => {
    const sp = buildSettlementQuery(params);
    const res = await fetchClient<ApiResponse<{ export_id: string }>>(
      "/sales/settlements/export/async?" + sp.toString(),
    );
    return res.data.export_id;
  },

  barcodePdf: (params: BarcodeReportParams): Promise<Blob> => {
    return fetchBlobPost(`/reports/barcode/pdf`, params, "application/pdf");
  },

  penyesuaianStokPdf: (params: PenyesuaianStokPdfParams): Promise<Blob> => {
    return fetchBlobPost(
      `/reports/penyesuaian-stok/pdf`,
      params,
      "application/pdf",
    );
  },

  penyesuaianStokExportAsync: async (
    params: PenyesuaianStokPdfParams,
  ): Promise<string> => {
    const response = await fetchClient<ApiResponse<{ export_id: string }>>(
      `/reports/penyesuaian-stok/export/async`,
      { method: "POST", data: params },
    );
    return response.data.export_id;
  },
};
