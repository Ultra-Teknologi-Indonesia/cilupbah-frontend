import { fetchClient, fetchBlobRaw } from "@/lib/api-client";
import type { ApiResponse, ApiPaginated } from "@/types/api.types";
import type {
  Inbound,
  InboundItem,
  InboundListParams,
  InboundReceipt,
} from "@/types/barang-masuk/inbound";

export interface InboundReceiptsParams {
  page?: number;
  per_page?: number;
  "filter[received_by_user_id]"?: string;
  "filter[inbound_item_id]"?: string;
  "filter[condition]"?: string;
  "filter[date_from]"?: string;
  "filter[date_to]"?: string;
  sort?: string;
}

export interface ScanPutawayPayload {
  inbound_item_id: string;
  bin_id: string;
  qty: number;
}

export interface InboundItemTotals {
  expected_qty: number;
  received_qty: number;
  putaway_qty: number;
  line_count: number;
}

export interface InboundItemsResponse extends ApiPaginated<InboundItem> {
  meta: ApiPaginated<InboundItem>["meta"] & { totals?: InboundItemTotals };
}

export const InboundService = {
  list: async (params: InboundListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.search) sp.set("search", params.search);
    if (params.page) sp.set("page", String(params.page));
    if (params.per_page) sp.set("per_page", String(params.per_page));
    if (params["filter[status]"])
      sp.set("filter[status]", params["filter[status]"]);
    if (params["filter[type]"]) sp.set("filter[type]", params["filter[type]"]);
    if (params["filter[location_id]"])
      sp.set("filter[location_id]", params["filter[location_id]"]);
    if (params["filter[source_type]"])
      sp.set("filter[source_type]", params["filter[source_type]"]);
    if (params["filter[date_from]"])
      sp.set("filter[date_from]", params["filter[date_from]"]);
    if (params["filter[date_to]"])
      sp.set("filter[date_to]", params["filter[date_to]"]);
    if (params.sort) sp.set("sort", params.sort);

    const res = await fetchClient<ApiPaginated<Inbound>>(`/inbounds?${sp}`);
    return { items: res.data ?? [], meta: res.meta };
  },

  getById: async (id: string) => {
    const res = await fetchClient<ApiResponse<Inbound>>(`/inbounds/${id}`);
    return res.data;
  },

  getItems: async (
    id: string,
    params: {
      page: number;
      perPage: number;
      search?: string;
      sort?: string;
    },
  ) => {
    const query: Record<string, string | number> = {
      page: params.page,
      per_page: params.perPage,
    };
    if (params.search) query.search = params.search;
    if (params.sort) query.sort = params.sort;

    const res = await fetchClient<InboundItemsResponse>(
      `/inbounds/${id}/items`,
      { params: query },
    );
    return res;
  },

  getReceipts: async (id: string, params: InboundReceiptsParams = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.per_page) sp.set("per_page", String(params.per_page));
    if (params["filter[received_by_user_id]"])
      sp.set(
        "filter[received_by_user_id]",
        params["filter[received_by_user_id]"],
      );
    if (params["filter[inbound_item_id]"])
      sp.set("filter[inbound_item_id]", params["filter[inbound_item_id]"]);
    if (params["filter[condition]"])
      sp.set("filter[condition]", params["filter[condition]"]);
    if (params["filter[date_from]"])
      sp.set("filter[date_from]", params["filter[date_from]"]);
    if (params["filter[date_to]"])
      sp.set("filter[date_to]", params["filter[date_to]"]);
    if (params.sort) sp.set("sort", params.sort);

    const res = await fetchClient<ApiPaginated<InboundReceipt>>(
      `/inbounds/${id}/receipts?${sp}`,
    );
    return res;
  },

  scanPutaway: async (payload: ScanPutawayPayload) => {
    const res = await fetchClient<ApiResponse<unknown>>(
      "/inbounds/scan-putaway",
      {
        method: "POST",
        data: payload,
      },
    );
    return res.data;
  },

  correctReceivedLine: async (
    inboundId: string,
    itemId: string,
    qty?: number,
  ) => {
    const res = await fetchClient<ApiResponse<Inbound>>(
      `/inbounds/${inboundId}/items/${itemId}/received`,
      {
        method: "DELETE",
        data: qty != null ? { qty } : undefined,
      },
    );
    return res.data;
  },

  correctReceivedLines: async (
    inboundId: string,
    items: { item_id: string; qty?: number }[],
  ) => {
    const res = await fetchClient<ApiResponse<Inbound>>(
      `/inbounds/${inboundId}/received`,
      {
        method: "DELETE",
        data: { items },
      },
    );
    return res.data;
  },

  setReceivedQty: async (
    inboundId: string,
    itemId: string,
    qty: number,
    expectedUpdatedAt?: string | null,
  ) => {
    const res = await fetchClient<ApiResponse<Inbound>>(
      `/inbounds/${inboundId}/items/${itemId}/received-qty`,
      {
        method: "PATCH",
        data: expectedUpdatedAt
          ? { qty, _expected_updated_at: expectedUpdatedAt }
          : { qty },
      },
    );
    return res.data;
  },

  setDiscrepancyNote: async (
    inboundId: string,
    itemId: string,
    note: string | null,
  ) => {
    const res = await fetchClient<ApiResponse<Inbound>>(
      `/inbounds/${inboundId}/items/${itemId}/note`,
      {
        method: "PATCH",
        data: { note: note ?? "" },
      },
    );
    return res.data;
  },

  bulkCancel: async (ids: string[]) => {
    const res = await fetchClient<
      ApiResponse<{
        cancelled: string[];
        failed: {
          id: string;
          transaction_number?: string | null;
          message: string;
        }[];
      }>
    >(`/inbounds/bulk-cancel`, {
      method: "POST",
      data: { ids },
    });
    return res.data;
  },

  unassign: async (
    inboundId: string,
    payload: {
      reason_code: string;
      reason_note?: string;
      new_assignee_id?: string;
    },
  ) => {
    const res = await fetchClient<ApiResponse<Inbound>>(
      `/inbounds/${inboundId}/assignment`,
      { method: "DELETE", data: payload },
    );
    return res.data;
  },

  resetAssignment: async (
    inboundId: string,
    payload: { reason_note: string; new_assignee_id?: string },
  ) => {
    const res = await fetchClient<ApiResponse<Inbound>>(
      `/inbounds/${inboundId}/assignment/reset`,
      { method: "POST", data: payload },
    );
    return res.data;
  },

  barcodesPdf: async (id: string): Promise<Blob> => {
    return fetchBlobRaw(
      `/inbounds/${encodeURIComponent(id)}/barcodes`,
      "application/pdf",
    );
  },

  pdf: async (id: string): Promise<Blob> => {
    return fetchBlobRaw(
      `/inbounds/${encodeURIComponent(id)}/pdf`,
      "application/pdf",
    );
  },

  withdrawParticipant: async (
    inboundId: string,
    userId: string,
    reasonNote?: string,
  ) => {
    const res = await fetchClient<ApiResponse<Inbound>>(
      `/inbounds/${inboundId}/participants/${userId}/withdraw`,
      {
        method: "POST",
        data: reasonNote ? { reason_note: reasonNote } : {},
      },
    );
    return res.data;
  },

  finalize: async (id: string) => {
    const res = await fetchClient<ApiResponse<Inbound>>(
      `/inbounds/${id}/close-receiving`,
      { method: "POST" },
    );
    return res.data;
  },

  receiveAdditional: async (poId: string) => {
    const res = await fetchClient<ApiResponse<Inbound>>(
      `/purchase-orders/${poId}/receive-additional`,
      { method: "POST" },
    );
    return res.data;
  },
};
