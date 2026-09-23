import { fetchClient } from "@/lib/api-client";
import type { ApiPaginated, ApiResponse } from "@/types/api.types";
import type {
  ContactChannel,
  CustomerDecision,
  Order,
  OrderCountParams,
  OrderListParams,
  OrderTabCounts,
} from "@/types/pesanan/order";

export interface CancelReason {
  key: string;
  label: string;
}

export interface UpdateOrderItemData {
  sku?: string;
  description?: string;
  qty_in_base?: number;
  price?: number;
  disc_amount?: number;
  tax_amount?: number;
}

export interface BulkActionResult {
  processed: number;
  succeeded: number;
  failed: Array<{ id: string; status: "failed"; message: string }>;
  results: Array<{ id: string; status: "success" | "failed"; message?: string }>;
}

function appendOrderFilters(
  sp: URLSearchParams,
  params: OrderCountParams,
) {
  if (params.q) sp.set("q", params.q);
  if (params.channel?.toLowerCase() === "tokopedia") {
    sp.set("filter[commerce_platform]", "TOKOPEDIA");
  } else if (params.channel) {
    sp.set("filter[channel]", params.channel);
  }
  if (params.store_id) sp.set("filter[store_id]", params.store_id);
  if (params.location_id) sp.set("filter[location_id]", params.location_id);
  if (params.content_type)
    sp.set("filter[content_type]", params.content_type);
  if (params.date_from) sp.set("filter[date_from]", params.date_from);
  if (params.date_to) sp.set("filter[date_to]", params.date_to);
  if (params.shipping_provider) {
    if (Array.isArray(params.shipping_provider)) {
      for (const p of params.shipping_provider) {
        if (p) sp.append("filter[shipping_provider][]", p);
      }
    } else {
      sp.set("filter[shipping_provider]", params.shipping_provider);
    }
  }
  if (params.payment) sp.set("filter[payment]", params.payment);
  if (params.label_printed)
    sp.set("filter[label_printed]", params.label_printed);
  if (params.contact_status)
    sp.set("filter[contact_status]", params.contact_status);
  if (params.decision) sp.set("filter[decision]", params.decision);
  if (params.item_id) sp.set("filter[item_id]", params.item_id);
  for (const s of params.status ?? []) sp.append("filter[status][]", s);
}

export const OrderService = {
  list: (params: OrderListParams) => {
    const sp = new URLSearchParams();
    if (params.tab && params.tab !== "all") sp.set("tab", params.tab);
    if (params.sub) sp.set("sub", params.sub);
    appendOrderFilters(sp, params);
    if (params.page) sp.set("page", String(params.page));
    if (params.per_page) sp.set("per_page", String(params.per_page));
    if (params.sort) {
      sp.set("sort", params.sort);
    } else if (params.sort_dir) {
      const prefix = params.sort_dir === "asc" ? "" : "-";
      const field = params.sort_by || "transaction_date";
      sp.set("sort", `${prefix}${field}`);
    } else if (params.sort_by) {
      sp.set("sort", params.sort_by);
    }

    return fetchClient<ApiPaginated<Order>>(`/sales?${sp}`);
  },

  getShippingProviders: (params?: {
    tab?: string;
    sub?: string;
    channel?: string;
    store_id?: string;
    location_id?: string;
    date_from?: string;
    date_to?: string;
    status?: string[];
  }): Promise<ApiResponse<Array<{ name: string; count: number }>>> => {
    const sp = new URLSearchParams();
    if (params?.tab && params.tab !== "all") sp.set("tab", params.tab);
    if (params?.sub) sp.set("sub", params.sub);
    if (params?.channel?.toLowerCase() === "tokopedia") {
      sp.set("filter[commerce_platform]", "TOKOPEDIA");
    } else if (params?.channel) {
      sp.set("filter[channel]", params.channel);
    }
    if (params?.store_id) sp.set("filter[store_id]", params.store_id);
    if (params?.location_id) sp.set("filter[location_id]", params.location_id);
    if (params?.date_from) sp.set("filter[date_from]", params.date_from);
    if (params?.date_to) sp.set("filter[date_to]", params.date_to);
    for (const s of params?.status ?? []) sp.append("filter[status][]", s);

    return fetchClient<ApiResponse<Array<{ name: string; count: number }>>>(
      `/sales/shipping-providers?${sp}`,
    );
  },

  getById: (id: string) => {
    return fetchClient<ApiResponse<Order>>(`/sales/${id}?include=items`);
  },

  getCounts: (params?: OrderCountParams) => {
    const sp = new URLSearchParams();
    if (params) appendOrderFilters(sp, params);

    return fetchClient<ApiResponse<OrderTabCounts>>(
      `/sales/counts${sp.size > 0 ? `?${sp}` : ""}`,
    );
  },

  setPaid: (orderId: string, data?: { payment_method?: string }) => {
    return fetchClient<ApiResponse>("/sales/orders/set-as-paid", {
      method: "POST",
      data: { order_id: orderId, ...data },
    });
  },

  cancelOrder: (orderId: string, reason?: string) => {
    return fetchClient<ApiResponse>(`/sales/${orderId}`, {
      method: "PUT",
      data: { status: "cancelled", cancel_reason: reason },
    });
  },

  saveAirwaybill: (
    orderId: string,
    trackingNumber: string,
    provider?: string,
  ) => {
    return fetchClient<ApiResponse>("/sales/orders/save-airwaybill", {
      method: "POST",
      data: {
        order_id: orderId,
        tracking_number: trackingNumber,
        shipping_provider: provider,
      },
    });
  },

  markAsComplete: (orderIds: string[]) => {
    return fetchClient<ApiResponse>("/sales/orders/mark-as-complete", {
      method: "POST",
      data: { order_ids: orderIds },
    });
  },

  deleteCancelled: (ids: string[]) => {
    return fetchClient<ApiResponse>("/sales/orders/delete-canceled", {
      method: "POST",
      data: { ids },
    });
  },

  moveToReadyToProcess: (orderIds: string[]) => {
    return fetchClient<
      ApiResponse<{
        moved: number;
        skipped: Array<{
          id: string;
          salesorder_no: string | null;
          reason?: "cancel_pending" | "empty_stock";
        }>;
      }>
    >("/sales/orders/move-to-ready", {
      method: "POST",
      data: { order_ids: orderIds },
    });
  },

  relocateOrder: (orderId: string, locationId: string) => {
    return fetchClient<ApiResponse>(`/sales/${orderId}/relocate`, {
      method: "PUT",
      data: { location_id: locationId },
    });
  },

  acceptCancelRequest: (orderId: string, reason?: string) => {
    return fetchClient<ApiResponse>(`/sales/orders/${orderId}/accept-cancel`, {
      method: "POST",
      data: reason ? { reason } : undefined,
    });
  },

  bulkAcceptCancelRequest: (orderIds: string[], reason?: string) => {
    return fetchClient<ApiResponse<BulkActionResult>>("/sales/orders/bulk-accept-cancel", {
      method: "POST",
      data: { order_ids: orderIds, ...(reason ? { reason } : {}) },
    });
  },

  rejectCancelRequest: (orderId: string, reason?: string) => {
    return fetchClient<ApiResponse>(`/sales/orders/${orderId}/reject-cancel`, {
      method: "POST",
      data: reason ? { reason } : undefined,
    });
  },

  bulkRejectCancelRequest: (orderIds: string[], reason?: string) => {
    return fetchClient<ApiResponse<BulkActionResult>>("/sales/orders/bulk-reject-cancel", {
      method: "POST",
      data: { order_ids: orderIds, ...(reason ? { reason } : {}) },
    });
  },

  retryBuyerCancellationSync: (orderId: string) => {
    return fetchClient<ApiResponse<Order>>(
      `/sales/orders/${orderId}/retry-cancel-sync`,
      { method: "POST" },
    );
  },

  cancelManualOrder: (orderId: string, reason?: string) => {
    return fetchClient<ApiResponse<Order>>(
      `/sales/orders/${orderId}/cancel-manual`,
      {
        method: "POST",
        data: reason ? { reason } : undefined,
      },
    );
  },

  bulkCancelManualOrder: (orderIds: string[], reason?: string) => {
    return fetchClient<ApiResponse>("/sales/orders/bulk-cancel-manual", {
      method: "POST",
      data: { order_ids: orderIds, reason },
    });
  },

  getOrderCancelReasons: (orderId: string) => {
    return fetchClient<ApiResponse<CancelReason[]>>(
      `/sales/orders/${orderId}/cancel-reasons`,
    );
  },

  requestChannelCancel: (orderId: string, reason: string) => {
    return fetchClient<ApiResponse<Order>>(
      `/sales/orders/${orderId}/request-cancel`,
      {
        method: "POST",
        data: { reason },
      },
    );
  },

  bulkRequestChannelCancel: (orderIds: string[], reason: string) => {
    return fetchClient<ApiResponse<BulkActionResult>>("/sales/orders/bulk-request-cancel", {
      method: "POST",
      data: { order_ids: orderIds, reason },
    });
  },

  releaseChannelCancel: (orderId: string) => {
    return fetchClient<ApiResponse<Order>>(
      `/sales/orders/${orderId}/release-cancel`,
      { method: "POST" },
    );
  },

  exportOrders: async (params: {
    tab?: string;
    date_from?: string;
    date_to?: string;
    source?: string;
    search?: string;
    store_id?: string;
    location_id?: string;
  }): Promise<string> => {
    const sp = new URLSearchParams();
    if (params.tab) sp.set("tab", params.tab);
    if (params.date_from) sp.set("date_from", params.date_from);
    if (params.date_to) sp.set("date_to", params.date_to);
    if (params.source) sp.set("source", params.source);
    if (params.search) sp.set("search", params.search);
    if (params.store_id) sp.set("store_id", params.store_id);
    if (params.location_id) sp.set("location_id", params.location_id);

    const response = await fetchClient<ApiResponse<{ export_id: string }>>(
      `/sales/orders/export/async?${sp}`,
    );
    return response.data.export_id;
  },

  exportCancelled: async (params: {
    date_from?: string;
    date_to?: string;
    post_pack_only?: boolean;
    source?: string;
  }): Promise<string> => {
    const sp = new URLSearchParams();
    if (params.date_from) sp.set("date_from", params.date_from);
    if (params.date_to) sp.set("date_to", params.date_to);
    if (params.post_pack_only) sp.set("post_pack_only", "1");
    if (params.source) sp.set("source", params.source);

    const response = await fetchClient<ApiResponse<{ export_id: string }>>(
      `/sales/orders/cancelled/export/async?${sp}`,
    );
    return response.data.export_id;
  },

  saveReceivedDate: (orderId: string, receivedDate?: string) => {
    return fetchClient<ApiResponse>("/sales/orders/save-received-date", {
      method: "POST",
      data: { order_id: orderId, received_date: receivedDate },
    });
  },

  requestAwb: (orderId: string, courierCode?: string) => {
    return fetchClient<ApiResponse>("/sales/request-awb-order", {
      method: "POST",
      data: { order_id: orderId, courier_code: courierCode },
    });
  },

  acceptReturn: (returnId: string) => {
    return fetchClient<ApiResponse>(`/sales/returns/${returnId}/accept`, {
      method: "POST",
    });
  },

  bulkAcceptReturn: (returnIds: string[], processedBy?: string) => {
    return fetchClient<ApiResponse<BulkActionResult>>("/sales/returns/bulk-accept", {
      method: "POST",
      data: { return_ids: returnIds, ...(processedBy ? { processed_by: processedBy } : {}) },
    });
  },

  rejectReturn: (returnId: string, reason?: string) => {
    return fetchClient<ApiResponse>(`/sales/returns/${returnId}/reject`, {
      method: "POST",
      data: { reason },
    });
  },

  bulkRejectReturn: (returnIds: string[], reason?: string, processedBy?: string) => {
    return fetchClient<ApiResponse<BulkActionResult>>("/sales/returns/bulk-reject", {
      method: "POST",
      data: {
        return_ids: returnIds,
        ...(reason ? { reason } : {}),
        ...(processedBy ? { processed_by: processedBy } : {}),
      },
    });
  },

  markContacted: (
    orderId: string,
    data?: { channel?: ContactChannel; note?: string },
  ) => {
    return fetchClient<ApiResponse<Order>>(
      `/sales/orders/${orderId}/mark-contacted`,
      {
        method: "POST",
        data: data ?? {},
      },
    );
  },

  bulkMarkContacted: (
    orderIds: string[],
    data?: { channel?: ContactChannel; note?: string },
  ) => {
    return fetchClient<ApiResponse>("/sales/orders/bulk-mark-contacted", {
      method: "POST",
      data: { order_ids: orderIds, ...(data ?? {}) },
    });
  },

  setCustomerDecision: (
    orderId: string,
    decision: CustomerDecision,
    note?: string,
    replacementSku?: string,
    replacementItemId?: string,
  ) => {
    return fetchClient<ApiResponse<Order>>(
      `/sales/orders/${orderId}/customer-decision`,
      {
        method: "POST",
        data: {
          decision,
          note,
          replacement_sku: replacementSku,
          replacement_item_id: replacementItemId,
        },
      },
    );
  },

  updateOrderItem: (
    orderId: string,
    itemId: string,
    data: UpdateOrderItemData,
  ) => {
    return fetchClient<ApiResponse<Order>>(
      `/sales/orders/${orderId}/items/${itemId}`,
      {
        method: "PATCH",
        data,
      },
    );
  },

  downloadOrderItem: (orderId: string, itemId: string, variantId?: string) => {
    return fetchClient<ApiResponse<Order>>(
      `/sales/${orderId}/items/${itemId}/download`,
      {
        method: "POST",
        data: variantId ? { variant_id: variantId } : undefined,
      },
    );
  },

  deleteOrderItem: (orderId: string, itemId: string) => {
    return fetchClient<ApiResponse<Order>>(
      `/sales/orders/${orderId}/items/${itemId}`,
      {
        method: "DELETE",
      },
    );
  },

  saveCourierPickup: (
    orderId: string,
    data: {
      courier_name?: string | null;
      courier_phone?: string | null;
      pickup_code?: string | null;
    },
  ) => {
    return fetchClient<ApiResponse<Order>>(`/sales/${orderId}/courier-pickup`, {
      method: "PUT",
      data,
    });
  },

  uploadCourierIdPhoto: (orderId: string, file: File) => {
    const fd = new FormData();
    fd.append("photo", file);
    return fetchClient<ApiResponse<Order>>(
      `/sales/${orderId}/courier-pickup/photo`,
      {
        method: "POST",
        data: fd,
        headers: { "Content-Type": undefined as unknown as string },
      },
    );
  },

  deleteCourierIdPhoto: (orderId: string) => {
    return fetchClient<ApiResponse<Order>>(
      `/sales/${orderId}/courier-pickup/photo`,
      { method: "DELETE" },
    );
  },
};
