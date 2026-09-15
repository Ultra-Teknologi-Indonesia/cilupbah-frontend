import {
  fetchClient,
  fetchBlob,
  fetchBlobRaw,
  fetchBlobPost,
} from "@/lib/api-client";
import type { ApiResponse, ApiPaginated } from "@/types/api.types";
import type {
  InventoryTransfer,
  InventoryTransferListParams,
} from "@/types/barang-masuk/inventory-transfer";
import type {
  TransferImportPreview,
  TransferImportConfirmResult,
} from "@/types/barang-keluar/transfer-import";

export interface BulkTransferDeleteResult {
  deleted: number;
  reverted: number;
  failed: Array<{ id: string; reason: string }>;
}

export interface CreateTransferDraftPayload {
  source_location_id: string;
  destination_location_id: string;
  notes?: string;
  created_by: string;
  transfer_number?: string;
}

export interface AddTransferItemPayload {
  item_id: string;
  qty: number;
  source_bin_id?: string;
  batch_no?: string;
  serial_no?: string;
}

export const OutboundTransferService = {
  listDrafts: async (params: InventoryTransferListParams = {}) => {
    const sp = buildParams(params);
    const res = await fetchClient<ApiPaginated<InventoryTransfer>>(
      `/inventory/transfers/drafts?${sp}`,
    );
    return { items: res.data ?? [], meta: res.meta };
  },

  listApproved: async (params: InventoryTransferListParams = {}) => {
    const sp = buildParams(params);
    const res = await fetchClient<ApiPaginated<InventoryTransfer>>(
      `/inventory/transfers/approved?${sp}`,
    );
    return { items: res.data ?? [], meta: res.meta };
  },

  listTransit: async (params: InventoryTransferListParams = {}) => {
    const sp = buildParams(params);
    const res = await fetchClient<ApiPaginated<InventoryTransfer>>(
      `/inventory/transfers/transit?${sp}`,
    );
    return { items: res.data ?? [], meta: res.meta };
  },

  listFinished: async (params: InventoryTransferListParams = {}) => {
    const sp = buildParams(params);
    const res = await fetchClient<ApiPaginated<InventoryTransfer>>(
      `/inventory/transfers/out-finished?${sp}`,
    );
    return { items: res.data ?? [], meta: res.meta };
  },

  getById: async (id: string) => {
    const res = await fetchClient<ApiResponse<InventoryTransfer>>(
      `/inventory/transfers/${id}`,
    );
    return res.data;
  },

  createDraft: async (data: CreateTransferDraftPayload) => {
    const res = await fetchClient<ApiResponse<InventoryTransfer>>(
      "/inventory/transfers/draft",
      {
        method: "POST",
        data,
      },
    );
    return res.data;
  },

  updateDraft: async (
    id: string,
    data: Partial<CreateTransferDraftPayload>,
  ) => {
    const res = await fetchClient<ApiResponse<InventoryTransfer>>(
      `/inventory/transfers/${id}`,
      {
        method: "PATCH",
        data,
      },
    );
    return res.data;
  },

  addItem: async (id: string, data: AddTransferItemPayload) => {
    const res = await fetchClient<ApiResponse<unknown>>(
      `/inventory/transfers/${id}/items`,
      {
        method: "POST",
        data,
      },
    );
    return res.data;
  },

  updateItem: async (
    id: string,
    itemId: string,
    data: { qty: number; source_bin_id?: string | null },
  ) => {
    const res = await fetchClient<ApiResponse<unknown>>(
      `/inventory/transfers/${id}/items/${itemId}`,
      {
        method: "PATCH",
        data,
      },
    );
    return res.data;
  },

  removeItem: async (id: string, itemId: string) => {
    const res = await fetchClient<ApiResponse<unknown>>(
      `/inventory/transfers/${id}/items/${itemId}`,
      {
        method: "DELETE",
      },
    );
    return res.data;
  },

  approve: async (
    id: string,
    data: { approved_by: string; assigned_to?: number },
  ) => {
    const res = await fetchClient<ApiResponse<InventoryTransfer>>(
      `/inventory/transfers/${id}/approve`,
      {
        method: "POST",
        data,
      },
    );
    return res.data;
  },

  submitDraft: async (id: string) => {
    const res = await fetchClient<ApiResponse<InventoryTransfer>>(
      `/inventory/transfers/${id}/submit`,
      {
        method: "POST",
      },
    );
    return res.data;
  },

  revertToDraft: async (id: string) => {
    const res = await fetchClient<ApiResponse<InventoryTransfer>>(
      `/inventory/transfers/${id}/revert-to-draft`,
      {
        method: "POST",
      },
    );
    return res.data;
  },

  ship: async (id: string, data: { shipped_by: string }) => {
    const res = await fetchClient<ApiResponse<InventoryTransfer>>(
      `/inventory/transfers/${id}/ship`,
      {
        method: "POST",
        data,
      },
    );
    return res.data;
  },

  cancel: async (
    id: string,
    data: { cancelled_by: string; cancel_reason?: string },
  ) => {
    const res = await fetchClient<ApiResponse<InventoryTransfer>>(
      `/inventory/transfers/${id}/cancel`,
      {
        method: "POST",
        data,
      },
    );
    return res.data;
  },

  delete: async (id: string) => {
    const res = await fetchClient<ApiResponse<unknown>>(
      `/inventory/transfers/${id}`,
      {
        method: "DELETE",
      },
    );
    return res.data;
  },

  markPrinted: async (data: { transfer_id: string; printed_by: string }) => {
    const res = await fetchClient<ApiResponse<unknown>>(
      "/inventory/transfer/mark-printed",
      {
        method: "POST",
        data,
      },
    );
    return res.data;
  },

  getDeliveryNote: async (transferId: string) => {
    const res = await fetchClient<ApiResponse<unknown>>(
      `/inventory/transfer/delivery?transfer_id=${transferId}`,
    );
    return res.data;
  },

  pdf: async (id: string): Promise<Blob> => {
    return fetchBlobRaw(
      `/inventory/transfers/${encodeURIComponent(id)}/pdf`,
      "application/pdf",
    );
  },

  bulkPdf: async (ids: string[]): Promise<Blob> => {
    return fetchBlobPost(
      "/inventory/transfers/bulk/pdf",
      { ids },
      "application/pdf",
    );
  },

  bulkPdfAsync: async (
    ids: string[],
  ): Promise<{ export_id: string; total: number }> => {
    const res = await fetchClient<
      ApiResponse<{ export_id: string; total: number }>
    >("/inventory/transfers/bulk/pdf/async", {
      method: "POST",
      data: { ids },
    });
    return res.data;
  },

  bulkDelete: async (ids: string[]): Promise<BulkTransferDeleteResult> => {
    const res = await fetchClient<ApiResponse<BulkTransferDeleteResult>>(
      "/inventory/transfers/bulk/delete",
      { method: "POST", data: { ids } },
    );
    return res.data;
  },

  downloadTemplate: (): Promise<void> =>
    fetchBlob(
      "/inventory/transfers/import/template",
      "template-import-transfer-keluar.xlsx",
    ),

  importTemplateUrl: (): string =>
    "/api/app/inventory/transfers/import/template",

  importPreview: async (file: File): Promise<TransferImportPreview> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetchClient<ApiResponse<TransferImportPreview>>(
      "/inventory/transfers/import/preview",
      {
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  },

  importConfirm: async (
    previewToken: string,
    createdBy: string,
  ): Promise<TransferImportConfirmResult> => {
    const res = await fetchClient<ApiResponse<TransferImportConfirmResult>>(
      "/inventory/transfers/import/confirm",
      {
        method: "POST",
        data: { preview_token: previewToken, created_by: createdBy },
      },
    );
    return res.data;
  },
};

function buildParams(params: InventoryTransferListParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.page) sp.set("page", String(params.page));
  if (params.per_page) sp.set("per_page", String(params.per_page));
  if (params["filter[status]"])
    sp.set("filter[status]", params["filter[status]"]);
  if (params["filter[source_location_id]"])
    sp.set("filter[source_location_id]", params["filter[source_location_id]"]);
  if (params["filter[destination_location_id]"])
    sp.set(
      "filter[destination_location_id]",
      params["filter[destination_location_id]"],
    );
  if (params["filter[date_from]"])
    sp.set("filter[date_from]", params["filter[date_from]"]);
  if (params["filter[date_to]"])
    sp.set("filter[date_to]", params["filter[date_to]"]);
  if (params.sort) sp.set("sort", params.sort);
  return sp;
}
