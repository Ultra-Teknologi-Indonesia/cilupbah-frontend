import { fetchBlobRaw, fetchClient } from "@/lib/api-client";
import type { ApiPaginated, ApiResponse } from "@/types/api.types";
import type {
  Location,
  LocationBin,
  LocationListParams,
  LocationPayload,
  RawLocation,
  RawLocationBin,
} from "@/types/manajemen-rak/location";

function mapBin(raw: RawLocationBin): LocationBin {
  return {
    id: raw.id,
    floorCode: raw.floor_code,
    rowCode: raw.row_code,
    columnCode: raw.column_code,
    binCode: raw.bin_code,
    binFinalCode: raw.bin_final_code,
    isInbound: raw.is_inbound,
    isStockAcknowledged: raw.is_stock_acknowledged ?? true,
    isLargeBin: raw.is_large_bin ?? false,
    allowsMultiSku: raw.allows_multi_sku ?? false,
    skus: (raw.skus ?? []).map((s) => ({
      variantId: s.variant_id,
      sku: s.sku,
      name: s.name,
      onHand: s.on_hand,
      reserved: s.reserved,
    })),
  };
}

export function mapLocation(raw: RawLocation): Location {
  return {
    id: raw.id,
    locationCode: raw.location_code,
    locationName: raw.location_name,
    locationType: raw.location_type,
    address: raw.address,
    postCode: raw.post_code,
    villageId: raw.village_id,
    phone: raw.phone,
    email: raw.email,
    coordinate: raw.coordinate,
    defaultWarehouseUser: raw.default_warehouse_user,
    isWarehouse: Boolean(raw.is_warehouse),
    isMultiOrigin: Boolean(raw.is_multi_origin),
    isActive: Boolean(raw.is_active),
    isSystem: Boolean(raw.is_system),
    isLocked: Boolean(raw.is_locked),
    isPos: Boolean(raw.is_pos),
    isSmallWarehouse: Boolean(
      raw.is_small_warehouse ?? raw.enforces_strict_bin_sku,
    ),
    enforcesStrictBinSku: Boolean(
      raw.enforces_strict_bin_sku ?? raw.is_small_warehouse,
    ),
    village: raw.village ?? null,
    bins: (raw.bins ?? []).map(mapBin),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export interface LocationListResult {
  items: Location[];
  meta: ApiPaginated<RawLocation>["meta"];
}

export type BinQrPaper =
  "thermal_50x40" | "thermal_80x40" | "a4_single" | "a4_multi";

export const BIN_QR_PAPER_DEFAULT: BinQrPaper = "thermal_50x40";

export const LocationService = {
  list: async (
    params: LocationListParams = {},
  ): Promise<LocationListResult> => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.sort) q.set("sort", params.sort);
    q.set("page", String(params.page ?? 1));
    q.set("per_page", String(params.perPage ?? 20));

    const res = await fetchClient<ApiPaginated<RawLocation>>(
      `/locations?${q.toString()}`,
    );
    return { items: (res.data ?? []).map(mapLocation), meta: res.meta };
  },

  detail: async (id: string): Promise<Location> => {
    const res = await fetchClient<ApiResponse<RawLocation>>(`/locations/${id}`);
    return mapLocation(res.data);
  },

  create: async (payload: LocationPayload): Promise<Location> => {
    const res = await fetchClient<ApiResponse<RawLocation>>(`/locations`, {
      method: "POST",
      data: payload,
    });
    return mapLocation(res.data);
  },

  update: async (
    id: string,
    payload: Partial<LocationPayload>,
  ): Promise<Location> => {
    const res = await fetchClient<ApiResponse<RawLocation>>(
      `/locations/${id}`,
      {
        method: "PUT",
        data: payload,
      },
    );
    return mapLocation(res.data);
  },

  remove: async (id: string): Promise<void> => {
    await fetchClient<ApiResponse<null>>(`/locations/${id}`, {
      method: "DELETE",
    });
  },

  patchBins: async (
    locationId: string,
    bins: {
      id: string;
      bin_final_code: string;
      is_stock_acknowledged: boolean;
      is_large_bin: boolean;
    }[],
  ): Promise<{ updated: number }> => {
    const res = await fetchClient<ApiResponse<{ updated: number }>>(
      `/locations/${locationId}/bins`,
      { method: "PATCH", data: { bins } },
    );
    return res.data;
  },

  binsPrintQrPdf: async (
    locationId: string,
    options?: { binIds?: string[]; paper?: BinQrPaper },
  ): Promise<Blob> => {
    const params = new URLSearchParams();
    if (options?.binIds && options.binIds.length > 0) {
      params.set("bin_ids", options.binIds.join(","));
    }
    if (options?.paper) params.set("paper", options.paper);
    const qs = params.toString();
    return fetchBlobRaw(
      `/locations/${locationId}/bins/print-qr${qs ? `?${qs}` : ""}`,
      "application/pdf",
    );
  },
  createBinQrJob: async (
    locationId: string,
    options?: { binIds?: string[]; paper?: BinQrPaper },
  ): Promise<{ job_id: string; status: string }> => {
    const data: Record<string, string> = {};
    if (options?.binIds && options.binIds.length > 0) {
      data.bin_ids = options.binIds.join(",");
    }
    if (options?.paper) data.paper = options.paper;

    const res = await fetchClient<
      ApiResponse<{ job_id: string; status: string }>
    >(`/locations/${locationId}/bins/print-qr-job`, { method: "POST", data });
    return res.data;
  },

  getBinQrJobStatus: async (
    jobId: string,
  ): Promise<{
    id: string;
    status: string;
    progress: { processed: number; total: number; percent: number };
    error_message?: string;
    download_url?: string;
  }> => {
    const res = await fetchClient<
      ApiResponse<{
        id: string;
        status: string;
        progress: { processed: number; total: number; percent: number };
        error_message?: string;
        download_url?: string;
      }>
    >(`/qr-jobs/${jobId}`);
    return res.data;
  },

  downloadBinQrJobPdf: async (jobId: string): Promise<Blob> => {
    return fetchBlobRaw(`/qr-jobs/${jobId}/download`, "application/pdf");
  },
};
