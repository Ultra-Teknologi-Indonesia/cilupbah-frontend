"use client";

import { useCallback } from "react";
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { createMutationHook } from "@/hooks/create-crud-hooks";
import { toast } from "sonner";
import { apiError } from "@/lib/toast";
import { invalidateStockViews } from "@/lib/stock-cache";
import { notifyOrderActivityChanged } from "@/lib/pesanan/order-activity-event";
import { useAsyncExport } from "@/hooks/laporan/use-async-export";

import {
  OutboundService,
  type CreateShipmentPayload,
  type ProcessOrdersExportScope,
} from "@/services/proses-pesanan/outbound.service";
import type {
  FulfillmentListParams,
  FulfillmentBoardCounts,
  PicklistItem,
  PacklistDetail,
} from "@/types/proses-pesanan/fulfillment";
import type { ApiPaginated } from "@/types/api.types";

const STALE = 30_000;
const all = ["proses-pesanan"] as const;

const board = [...all, "board"] as const;

export const fulfillmentKeys = {
  all,
  board,
  ordersByStage: (stage: string, p: FulfillmentListParams) =>
    [...board, "orders", stage, p] as const,
  picklists: (p: FulfillmentListParams) => [...board, "picklists", p] as const,
  picklistItems: (id: string) => [...board, "picklists", id, "items"] as const,
  packlists: (p: FulfillmentListParams) => [...board, "packlists", p] as const,
  shipments: (p: FulfillmentListParams) => [...board, "shipments", p] as const,
  count: (key: string) => [...board, "count", key] as const,
  counts: () => [...board, "counts"] as const,
  monitoring: () => [...board, "monitoring"] as const,
  pickers: (locationId?: string, role?: string) =>
    [...all, "pickers", locationId ?? "", role ?? ""] as const,
  picklistDetail: (id: string) => [...all, "picklist-detail", id] as const,
  packlistDetail: (id: string) => [...all, "packlist-detail", id] as const,
  shipmentDetail: (id: string) => [...all, "shipment-detail", id] as const,
  shipmentOrders: (id: string, p: FulfillmentListParams) =>
    [...all, "shipment-orders", id, p] as const,
};

export function useOrdersByStage(
  stage: string,
  params: FulfillmentListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: fulfillmentKeys.ordersByStage(stage, params),
    queryFn: () => OutboundService.ordersByStage(stage, params),
    staleTime: STALE,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePicklists(params: FulfillmentListParams, enabled = true) {
  return useQuery({
    queryKey: fulfillmentKeys.picklists(params),
    queryFn: () => OutboundService.picklists(params),
    staleTime: STALE,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePacklists(params: FulfillmentListParams, enabled = true) {
  return useQuery({
    queryKey: fulfillmentKeys.packlists(params),
    queryFn: () => OutboundService.packlists(params),
    staleTime: STALE,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useShipments(params: FulfillmentListParams, enabled = true) {
  return useQuery({
    queryKey: fulfillmentKeys.shipments(params),
    queryFn: () => OutboundService.shipments(params),
    staleTime: STALE,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useOutboundMonitoring(enabled = true) {
  return useQuery({
    queryKey: fulfillmentKeys.monitoring(),
    queryFn: () => OutboundService.monitoring(),
    staleTime: STALE,
    refetchInterval: 60_000,
    enabled,
  });
}

export function useExportProcessOrdersCsv() {
  return useAsyncExport((scope: ProcessOrdersExportScope) =>
    OutboundService.exportProcessOrdersCsv(scope),
  );
}

export function usePickers(locationId?: string, role?: string, enabled = true) {
  return useQuery({
    queryKey: fulfillmentKeys.pickers(locationId, role),
    queryFn: () => OutboundService.pickers(locationId, role),
    staleTime: 60_000,
    enabled,
  });
}

export function useCouriers(enabled = true) {
  return useQuery({
    queryKey: [...all, "couriers"],
    queryFn: () => OutboundService.couriersAll(),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useStageCourierOptions(
  stage: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: [...all, "courier-options", stage],
    queryFn: () => OutboundService.courierOptionsByStage(stage as string),
    staleTime: 60_000,
    enabled: enabled && !!stage,
  });
}

export function useFulfillmentCounts(enabled = true) {
  return useQuery<FulfillmentBoardCounts>({
    queryKey: fulfillmentKeys.counts(),
    queryFn: () => OutboundService.counts(),
    staleTime: STALE,
    refetchInterval: STALE,
    enabled,
  });
}

export const useCreatePicklist = createMutationHook({
  mutationFn: (payload: {
    order_ids: string[];
    location_id: string;
    picker_id: string;
    notes?: string | null;
  }) => OutboundService.createPicklist(payload),
  silentError: true,
  invalidates: () => [fulfillmentKeys.board],
});

export const useAssignPicker = createMutationHook({
  mutationFn: ({
    picklistId,
    pickerId,
  }: {
    picklistId: string;
    pickerId: string;
  }) => OutboundService.assignPicker(picklistId, pickerId),
  silentError: true,
  invalidates: () => [fulfillmentKeys.board],
});

export const useAssignPacker = createMutationHook({
  mutationFn: ({
    packlistId,
    packerId,
  }: {
    packlistId: string;
    packerId: string;
  }) => OutboundService.assignPacker(packlistId, packerId),
  silentError: true,
  invalidates: () => [fulfillmentKeys.board],
});

export const useReadyToShip = createMutationHook({
  mutationFn: (orderIds: string[]) => OutboundService.readyToShip(orderIds),
  silentError: true,
  invalidates: () => [fulfillmentKeys.board],
});

export const useRetryPickup = createMutationHook({
  mutationFn: (orderIds: string[]) => OutboundService.retryPickup(orderIds),
  silentError: true,
  invalidates: () => [fulfillmentKeys.board],
});

export const useStartPicklist = createMutationHook({
  mutationFn: (id: string) => OutboundService.startPicklist(id),
  silentError: true,
  invalidates: (id) => [
    fulfillmentKeys.board,
    fulfillmentKeys.picklistDetail(id),
  ],
});

export function usePicklistDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: fulfillmentKeys.picklistDetail(id),
    queryFn: () => OutboundService.picklistDetail(id),
    enabled: enabled && !!id,
  });
}

export function usePicklistItems(
  id: string,
  params: FulfillmentListParams,
  options?: { live?: boolean },
) {
  return useQuery({
    queryKey: [...fulfillmentKeys.picklistItems(id), params] as const,
    queryFn: () => OutboundService.picklistItems(id, params),
    enabled: !!id,
    refetchInterval: options?.live ? 5_000 : false,
    refetchIntervalInBackground: false,
  });
}

export function usePrefetchPicklistDetail() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      qc.prefetchQuery({
        queryKey: fulfillmentKeys.picklistDetail(id),
        queryFn: () => OutboundService.picklistDetail(id),
      });
    },
    [qc],
  );
}

export function usePrefetchPacklistDetail() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      qc.prefetchQuery({
        queryKey: fulfillmentKeys.packlistDetail(id),
        queryFn: () => OutboundService.packlistDetail(id),
      });
    },
    [qc],
  );
}

export function usePickItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      picklistId,
      itemId,
      qtyDelta,
      qtyPicked,
      binCode,
    }: {
      picklistId: string;
      itemId: string;
      binCode: string;
      qtyDelta?: number;
      qtyPicked?: number;
    }) =>
      OutboundService.pickItem(
        picklistId,
        itemId,
        qtyDelta != null
          ? { qty_delta: qtyDelta, bin_code: binCode }
          : { qty_picked: qtyPicked as number, bin_code: binCode },
      ),

    onMutate: async (v) => {
      const itemsKey = fulfillmentKeys.picklistItems(v.picklistId);
      await qc.cancelQueries({ queryKey: itemsKey });
      const prev = qc.getQueriesData({ queryKey: itemsKey });

      qc.setQueriesData<ApiPaginated<PicklistItem>>(
        { queryKey: itemsKey },
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((it) =>
              it.id === v.itemId
                ? {
                    ...it,
                    qtyPicked:
                      v.qtyDelta != null
                        ? Math.min(it.qtyOrdered, it.qtyPicked + v.qtyDelta)
                        : (v.qtyPicked as number),
                    binCode: v.binCode || it.binCode,
                  }
                : it,
            ),
          };
        },
      );

      return { prev };
    },
    onError: (_e, _v, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.picklistItems(v.picklistId),
      });
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.picklistDetail(v.picklistId),
      });
      invalidateStockViews(qc);
    },
  });
}

export function useUnpickItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      picklistId,
      itemId,
      qty,
    }: {
      picklistId: string;
      itemId: string;
      qty?: number;
    }) => OutboundService.unpickItem(picklistId, itemId, qty),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.picklistDetail(v.picklistId),
      });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      invalidateStockViews(qc);
    },
  });
}

export function useScanForPick() {
  return useMutation({
    mutationFn: ({
      picklistId,
      sku,
      binCode,
      hintActiveBinCode,
    }: {
      picklistId: string;
      sku: string;
      binCode?: string | null;
      hintActiveBinCode?: string | null;
    }) =>
      OutboundService.scanForPick(picklistId, {
        sku,
        bin_code: binCode ?? null,
        hint_active_bin_code: hintActiveBinCode ?? null,
      }),
  });
}

export function useCompletePicklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => OutboundService.completePicklist(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.picklistDetail(id) });
    },
  });
}

export function useDownloadPicklistPdf() {
  return useMutation({
    mutationFn: async ({
      picklistId,
      picklistNo,
    }: {
      picklistId: string;
      picklistNo?: string | null;
    }) => {
      const blob = await OutboundService.picklistPdf(picklistId);
      const filename = picklistNo
        ? `${picklistNo}.pdf`
        : `PICK-${picklistId}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return filename;
    },
    onSuccess: (filename) => {
      toast.success(`Picklist ${filename} berhasil diunduh`);
    },
    onError: (err) => {
      apiError(err, "Gagal mengunduh PDF picklist.");
    },
  });
}

export function useAdHocPick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      order_id: string;
      items?: Array<{
        order_item_id: string;
        qty_picked: number;
        bin_id?: string | null;
      }>;
    }) => OutboundService.adHocPick(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      invalidateStockViews(qc);
    },
  });
}

export function useGetOrderByNo() {
  return useMutation({
    mutationFn: (orderNo: string) => OutboundService.getOrderByNo(orderNo),
  });
}

export function useAdHocPickScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      order_id: string;
      sku: string;
      qty?: number;
      bin_id?: string | null;
    }) => OutboundService.adHocPickScan(payload),
    onSuccess: (__d, __v) => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      invalidateStockViews(qc);
    },
  });
}

export function useFailPicklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      OutboundService.failPicklist(id, reason),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.picklistDetail(v.id) });
      invalidateStockViews(qc);
    },
  });
}

export function useRevertPicklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => OutboundService.revertPicklist(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.all });
      invalidateStockViews(qc);
    },
  });
}

export function useFailPickItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      picklistId,
      itemId,
      reasonCode,
      reasonNote,
    }: {
      picklistId: string;
      itemId: string;
      reasonCode: string;
      reasonNote?: string | null;
    }) =>
      OutboundService.failPickItem(picklistId, itemId, {
        reasonCode,
        reasonNote: reasonNote ?? null,
      }),
    onSuccess: (_d, v) => {
      toast.success("Item ditandai gagal.");
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.picklistDetail(v.picklistId),
      });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      invalidateStockViews(qc);
    },
  });
}

export function useUnfailPickItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      picklistId,
      itemId,
    }: {
      picklistId: string;
      itemId: string;
    }) => OutboundService.unfailPickItem(picklistId, itemId),
    onSuccess: (_d, v) => {
      toast.success("Tanda gagal item dibatalkan.");
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.picklistDetail(v.picklistId),
      });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      invalidateStockViews(qc);
    },
  });
}

export function useScanOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderNo,
      packerId,
    }: {
      orderNo: string;
      packerId?: string | null;
    }) => OutboundService.scanOrder(orderNo, packerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: fulfillmentKeys.board }),
  });
}

export function usePacklistDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: fulfillmentKeys.packlistDetail(id),
    queryFn: () => OutboundService.packlistDetail(id),
    enabled: enabled && !!id,
  });
}

export function usePacklistDetails(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: fulfillmentKeys.packlistDetail(id),
      queryFn: () => OutboundService.packlistDetail(id),
      enabled: !!id,
    })),
  });
}

export function useStartPacklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => OutboundService.startPacklist(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.packlistDetail(id) });
    },
  });
}

export function useVerifyBarcode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      packlistId,
      barcode,
    }: {
      packlistId: string;
      barcode: string;
    }) => OutboundService.verifyBarcode(packlistId, barcode),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.packlistDetail(v.packlistId),
      }),
  });
}

export function useUnpackItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      packlistId,
      itemId,
      qty,
    }: {
      packlistId: string;
      itemId: string;
      qty?: number;
    }) => OutboundService.unpackItem(packlistId, itemId, qty),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.packlistDetail(v.packlistId),
      });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
    },
  });
}

export function usePackItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      packlistId,
      itemId,
      qtyPacked,
      barcodeVerified,
    }: {
      packlistId: string;
      itemId: string;
      qtyPacked: number;
      barcodeVerified?: boolean;
    }) =>
      OutboundService.packItem(packlistId, itemId, {
        qty_packed: qtyPacked,
        barcode_verified: barcodeVerified,
      }),

    onMutate: async (v) => {
      const key = fulfillmentKeys.packlistDetail(v.packlistId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<PacklistDetail>(key);
      if (prev) {
        qc.setQueryData<PacklistDetail>(key, {
          ...prev,
          items: prev.items.map((it) =>
            it.id === v.itemId
              ? {
                  ...it,
                  qtyPacked: v.qtyPacked,
                  barcodeVerified: v.barcodeVerified ?? it.barcodeVerified,
                }
              : it,
          ),
        });
      }
      return { key, prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_d, _e, v) =>
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.packlistDetail(v.packlistId),
      }),
  });
}

export function useCompletePacklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => OutboundService.completePacklist(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.packlistDetail(id) });
    },
  });
}

export function useMarkComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderIds: string[]) => OutboundService.markComplete(orderIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: fulfillmentKeys.board }),
  });
}

export function useCreateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      orderIds,
      internalOnly,
    }: {
      payload: CreateShipmentPayload;
      orderIds: string[];
      internalOnly?: boolean;
    }) =>
      OutboundService.createShipmentWithOrders(payload, orderIds, {
        internalOnly,
      }),
    onSuccess: (_shipment, variables) => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      notifyOrderActivityChanged(variables.orderIds);
    },
  });
}

export function useHandOverShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) =>
      OutboundService.handOverShipment(shipmentId),
    onSuccess: (_shipment, shipmentId) => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      const detail = qc.getQueryData<{ orders?: Array<{ orderId: string }> }>(
        fulfillmentKeys.shipmentDetail(shipmentId),
      );
      notifyOrderActivityChanged(
        detail?.orders?.map((order) => order.orderId) ?? [],
      );
    },
  });
}

export function useCancelShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) =>
      OutboundService.cancelShipment(shipmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: fulfillmentKeys.board }),
  });
}

export function useShipmentDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: fulfillmentKeys.shipmentDetail(id),
    queryFn: () => OutboundService.shipmentDetail(id),
    enabled: enabled && !!id,
  });
}

export function useShipmentOrdersPaginated(
  id: string,
  params: FulfillmentListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: fulfillmentKeys.shipmentOrders(id, params),
    queryFn: () => OutboundService.shipmentOrdersPaginated(id, params),
    placeholderData: keepPreviousData,
    enabled: enabled && !!id,
  });
}

export function useScanOrderToShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      shipmentId,
      barcode,
    }: {
      shipmentId: string;
      barcode: string;
    }) => OutboundService.scanOrderToShipment(shipmentId, barcode),
    onSuccess: (result, v) => {
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.shipmentDetail(v.shipmentId),
      });
      qc.invalidateQueries({
        queryKey: [...fulfillmentKeys.all, "shipment-orders", v.shipmentId],
      });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      if (result.status === "added") {
        notifyOrderActivityChanged([result.shipmentOrder.orderId]);
      }
    },
  });
}

export function useRemoveOrderFromShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      shipmentId,
      orderIds,
    }: {
      shipmentId: string;
      orderIds: string[];
    }) => OutboundService.removeOrderFromShipment(shipmentId, orderIds),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.shipmentDetail(v.shipmentId),
      });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      notifyOrderActivityChanged(v.orderIds);
    },
  });
}

export function useDeleteFulfillmentOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      OutboundService.deleteFulfillmentOrder(orderId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.all });
      invalidateStockViews(qc);
    },
  });
}

export function useBulkDeleteFulfillmentOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderIds,
      reason,
    }: {
      orderIds: string[];
      reason: string;
    }) => OutboundService.bulkDeleteFulfillmentOrders(orderIds, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.all });
      invalidateStockViews(qc);
    },
  });
}

export function usePreManifestCancelCount() {
  return useQuery({
    queryKey: fulfillmentKeys.count("pre-manifest-cancel"),
    queryFn: () => OutboundService.preManifestCancelCount(),
    staleTime: STALE,
  });
}

export function useDismissPreManifestCancel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      OutboundService.preManifestCancelDismiss(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.count("pre-manifest-cancel"),
      });
    },
  });
}

export function useUndismissPreManifestCancel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      OutboundService.preManifestCancelUndismiss(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.count("pre-manifest-cancel"),
      });
    },
  });
}

export function useDownloadPreManifestCancelXlsx() {
  return useMutation({
    mutationFn: async (opts?: {
      date_from?: string | null;
      date_to?: string | null;
    }) => {
      const blob = await OutboundService.preManifestCancelExport(opts);
      const today = new Date().toISOString().slice(0, 10);
      const from = opts?.date_from ?? today;
      const to = opts?.date_to ?? today;
      const filename = `cancel-pasca-packing-${from}-${to}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return filename;
    },
    onSuccess: (filename) => {
      toast.success(`${filename} berhasil diunduh.`);
    },
    onError: (err) => {
      apiError(err, "Gagal mengunduh XLSX cancel.");
    },
  });
}

export function usePreManifestCancelList(
  params: import("@/types/proses-pesanan/fulfillment").FulfillmentListParams,
) {
  return useQuery({
    queryKey: [...fulfillmentKeys.board, "pre-manifest-cancel-list", params],
    queryFn: () => OutboundService.preManifestCancelList(params),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });
}

export function useRecordDriverCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      shipmentId,
      data,
      idCardPhoto,
    }: {
      shipmentId: string;
      data: {
        driver_name: string;
        driver_phone: string;
        driver_vehicle_plate?: string;
        driver_booking_code?: string;
        shipper_id?: string | number;
      };
      idCardPhoto?: File;
    }) => OutboundService.recordDriverCall(shipmentId, data, idCardPhoto),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.shipmentDetail(v.shipmentId),
      });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
    },
  });
}

export function useUpdateDriverCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      shipmentId,
      data,
      idCardPhoto,
    }: {
      shipmentId: string;
      data: {
        driver_name?: string;
        driver_phone?: string;
        driver_vehicle_plate?: string;
        driver_booking_code?: string;
        driver_call_status?: string;
        shipper_id?: string | number;
      };
      idCardPhoto?: File;
    }) => OutboundService.updateDriverCall(shipmentId, data, idCardPhoto),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.shipmentDetail(v.shipmentId),
      });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
    },
  });
}

export function useMarkDelivered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) =>
      OutboundService.markDelivered(shipmentId),
    onSuccess: (_d, shipmentId) => {
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.shipmentDetail(shipmentId),
      });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
    },
  });
}

export function useReconcileShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) =>
      OutboundService.reconcileShipment(shipmentId),
    onSuccess: (_d, shipmentId) => {
      qc.invalidateQueries({
        queryKey: fulfillmentKeys.shipmentDetail(shipmentId),
      });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
    },
  });
}

export function useCompletedShipments(
  params: import("@/types/proses-pesanan/fulfillment").FulfillmentListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: [...fulfillmentKeys.board, "completed-shipments", params],
    queryFn: () => OutboundService.completedShipments(params),
    staleTime: STALE,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useUnassignPicklist(picklistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      reason_code: string;
      reason_note?: string;
      new_assignee_id?: string;
    }) => OutboundService.unassignPicklist(picklistId, payload),
    onSuccess: (_data, vars) => {
      toast.success(
        vars.new_assignee_id
          ? "Tugas picking berhasil dialihkan"
          : "Assignment picking dibatalkan",
      );
      qc.invalidateQueries({ queryKey: fulfillmentKeys.all });
    },
    onError: (err) => apiError(err, "Gagal mengalihkan tugas picking"),
  });
}

export function useResetPicklistAssignment(picklistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { reason_note: string; new_assignee_id?: string }) =>
      OutboundService.resetPicklistAssignment(picklistId, payload),
    onSuccess: () => {
      toast.success("Picklist berhasil di-reset, alokasi pick dikembalikan");
      qc.invalidateQueries({ queryKey: fulfillmentKeys.all });
      invalidateStockViews(qc);
    },
    onError: (err) => apiError(err, "Gagal reset picklist"),
  });
}
