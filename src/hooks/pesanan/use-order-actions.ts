"use client";

import { useQuery } from "@tanstack/react-query";
import {
  OrderService,
  type UpdateOrderItemData,
} from "@/services/pesanan/order.service";
import type { ContactChannel, CustomerDecision } from "@/types/pesanan/order";
import { createMutationHook } from "@/hooks/create-crud-hooks";
import { orderKeys } from "./use-orders";

const listAndCounts = [orderKeys.lists, orderKeys.counts] as const;

const forOrder = (orderId: string) => [
  ...listAndCounts,
  orderKeys.detail(orderId),
];
const forBulk = () => [...listAndCounts, orderKeys.details];

export const useSetPaid = createMutationHook({
  mutationFn: (data: { orderId: string; paymentMethod?: string }) =>
    OrderService.setPaid(data.orderId, { payment_method: data.paymentMethod }),
  successMessage: "Pesanan berhasil ditandai dibayar",
  errorMessage: "Gagal mengubah status pembayaran",
  invalidates: ({ orderId }) => forOrder(orderId),
});

export const useCancelOrder = createMutationHook({
  mutationFn: (data: { orderId: string; reason?: string }) =>
    OrderService.cancelOrder(data.orderId, data.reason),
  successMessage: "Pesanan berhasil dibatalkan",
  errorMessage: "Gagal membatalkan pesanan",
  invalidates: ({ orderId }) => forOrder(orderId),
});

export const useSaveAirwaybill = createMutationHook({
  mutationFn: (data: {
    orderId: string;
    trackingNumber: string;
    provider?: string;
  }) =>
    OrderService.saveAirwaybill(
      data.orderId,
      data.trackingNumber,
      data.provider,
    ),
  successMessage: "Nomor resi berhasil disimpan",
  errorMessage: "Gagal menyimpan nomor resi",
  invalidates: ({ orderId }) => forOrder(orderId),
});

export const useMarkComplete = createMutationHook({
  mutationFn: (orderIds: string[]) => OrderService.markAsComplete(orderIds),
  successMessage: "Pesanan berhasil diselesaikan",
  errorMessage: "Gagal menyelesaikan pesanan",
  invalidates: forBulk,
});

export const useDeleteCancelled = createMutationHook({
  mutationFn: (ids: string[]) => OrderService.deleteCancelled(ids),
  successMessage: "Pesanan yang dibatalkan berhasil dihapus",
  errorMessage: "Gagal menghapus pesanan",
  invalidates: forBulk,
});

export const useMoveToReady = createMutationHook({
  mutationFn: (orderIds: string[]) =>
    OrderService.moveToReadyToProcess(orderIds),
  successMessage: (res) => {
    const moved = res.data?.moved ?? 0;
    const skipped = res.data?.skipped ?? [];
    if (skipped.length === 0) return "Pesanan siap diproses oleh gudang.";
    const cancelHeld = skipped.filter((s) => s.reason === "cancel_pending");
    const stockHeld = skipped.filter((s) => s.reason !== "cancel_pending");
    const parts = [`${moved} pesanan siap diproses`];
    if (stockHeld.length)
      parts.push(`${stockHeld.length} dilewati (stok kosong)`);
    if (cancelHeld.length)
      parts.push(`${cancelHeld.length} ditahan (pembatalan diproses)`);
    return parts.join(" · ");
  },
  errorMessage: "Gagal memindahkan pesanan",
  invalidates: forBulk,
});

export const useRequestAwb = createMutationHook({
  mutationFn: (data: { orderId: string; courierCode?: string }) =>
    OrderService.requestAwb(data.orderId, data.courierCode),
  successMessage: (res) => {
    const outcome = res.data as
      { status?: string; message?: string } | undefined;

    return outcome?.status === "skipped"
      ? (outcome.message ?? "Permintaan resi dilewati")
      : "Nomor resi berhasil diminta";
  },
  errorMessage: "Gagal meminta nomor resi",
  invalidates: ({ orderId }) => forOrder(orderId),
});

export const useAcceptCancelRequest = createMutationHook({
  mutationFn: (orderId: string) => OrderService.acceptCancelRequest(orderId),
  successMessage: "Pembatalan buyer diterima dan sudah dikonfirmasi ke channel",
  errorMessage: "Gagal menerima pembatalan",
  invalidateOnError: true,
  invalidates: (orderId) => forOrder(orderId),
});

export const useRejectCancelRequest = createMutationHook({
  mutationFn: (orderId: string) => OrderService.rejectCancelRequest(orderId),
  successMessage: "Pembatalan buyer ditolak dan sudah dikonfirmasi ke channel",
  errorMessage: "Gagal menolak pembatalan",
  invalidateOnError: true,
  invalidates: (orderId) => forOrder(orderId),
});

export const useRetryBuyerCancellationSync = createMutationHook({
  mutationFn: (orderId: string) =>
    OrderService.retryBuyerCancellationSync(orderId),
  successMessage:
    "Keputusan pembatalan buyer berhasil dikirim ulang ke channel",
  errorMessage: "Gagal mengirim ulang keputusan ke channel",
  invalidateOnError: true,
  invalidates: (orderId) => forOrder(orderId),
});

export const useRequestChannelCancel = createMutationHook({
  mutationFn: (data: { orderId: string; reason: string }) =>
    OrderService.requestChannelCancel(data.orderId, data.reason),
  successMessage: "Permintaan pembatalan dikirim ke marketplace",
  errorMessage: "Gagal mengirim permintaan pembatalan",
  invalidates: ({ orderId }) => forOrder(orderId),
});

export const useReleaseChannelCancel = createMutationHook({
  mutationFn: (orderId: string) => OrderService.releaseChannelCancel(orderId),
  successMessage: "Hold pembatalan dilepas, pesanan bisa diproses",
  errorMessage: "Gagal melepas hold pembatalan",
  invalidates: (orderId) => forOrder(orderId),
});

export function useOrderCancelReasons(
  orderId: string | null | undefined,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["order-cancel-reasons", orderId ?? null],
    queryFn: () => OrderService.getOrderCancelReasons(orderId as string),
    enabled: Boolean(orderId) && (opts?.enabled ?? true),
    staleTime: 60 * 1000,
  });
}

export const useAcceptReturn = createMutationHook({
  mutationFn: (returnId: string) => OrderService.acceptReturn(returnId),
  successMessage: "Retur berhasil diterima",
  errorMessage: "Gagal menerima retur",

  invalidates: forBulk,
});

export const useRejectReturn = createMutationHook({
  mutationFn: (data: { returnId: string; reason?: string }) =>
    OrderService.rejectReturn(data.returnId, data.reason),
  successMessage: "Retur berhasil ditolak",
  errorMessage: "Gagal menolak retur",
  invalidates: forBulk,
});

const bulkResult = (res: { data?: { succeeded?: number; failed?: unknown[] } }) => ({
  ok: res.data?.succeeded ?? 0,
  failed: res.data?.failed?.length ?? 0,
});

const bulkMessage = (verb: string) => (res: { ok: number; failed: number }) =>
  res.failed > 0
    ? `${res.ok} pesanan ${verb} · ${res.failed} gagal`
    : `${res.ok} pesanan ${verb}`;

export const useBulkAcceptCancelRequest = createMutationHook({
  mutationFn: (orderIds: string[]) =>
    OrderService.bulkAcceptCancelRequest(orderIds).then(bulkResult),
  successMessage: bulkMessage("pembatalannya diterima"),
  errorMessage: "Gagal menerima pembatalan",
  invalidates: forBulk,
});

export const useCancelManualOrder = createMutationHook({
  mutationFn: (data: { orderId: string; reason?: string }) =>
    OrderService.cancelManualOrder(data.orderId, data.reason),
  successMessage: "Pesanan manual berhasil dibatalkan",
  errorMessage: "Gagal membatalkan pesanan manual",
  invalidates: ({ orderId }) => forOrder(orderId),
});

export const useBulkCancelManualOrder = createMutationHook({
  mutationFn: (data: { orderIds: string[]; reason?: string }) =>
    OrderService.bulkCancelManualOrder(data.orderIds, data.reason),
  successMessage: "Pesanan manual berhasil dibatalkan secara massal",
  errorMessage: "Gagal membatalkan pesanan manual secara massal",
  invalidates: forBulk,
});

export const useBulkRejectCancelRequest = createMutationHook({
  mutationFn: (orderIds: string[]) =>
    OrderService.bulkRejectCancelRequest(orderIds).then(bulkResult),
  successMessage: bulkMessage("pembatalannya ditolak"),
  errorMessage: "Gagal menolak pembatalan",
  invalidates: forBulk,
});

export const useBulkRequestChannelCancel = createMutationHook({
  mutationFn: (data: { orderIds: string[]; reason: string }) =>
    OrderService.bulkRequestChannelCancel(data.orderIds, data.reason).then(bulkResult),
  successMessage: bulkMessage("diajukan pembatalannya"),
  errorMessage: "Gagal mengajukan pembatalan",
  invalidates: forBulk,
});

export const useBulkAcceptReturn = createMutationHook({
  mutationFn: (returnIds: string[]) =>
    OrderService.bulkAcceptReturn(returnIds).then(bulkResult),
  successMessage: bulkMessage("returnya diterima"),
  errorMessage: "Gagal menerima retur",
  invalidates: forBulk,
});

export const useBulkRejectReturn = createMutationHook({
  mutationFn: (returnIds: string[]) =>
    OrderService.bulkRejectReturn(returnIds).then(bulkResult),
  successMessage: bulkMessage("returnya ditolak"),
  errorMessage: "Gagal menolak retur",
  invalidates: forBulk,
});

export const useRelocateOrder = createMutationHook({
  mutationFn: (data: { orderId: string; locationId: string }) =>
    OrderService.relocateOrder(data.orderId, data.locationId),
  successMessage: "Lokasi pengambilan berhasil diubah",
  errorMessage: "Gagal mengubah lokasi pengambilan",
  invalidates: ({ orderId }) => forOrder(orderId),
});

export const useMarkContacted = createMutationHook({
  mutationFn: (data: {
    orderId: string;
    channel?: ContactChannel;
    note?: string;
  }) =>
    OrderService.markContacted(data.orderId, {
      channel: data.channel,
      note: data.note,
    }),
  successMessage: "Pesanan ditandai sudah dihubungi",
  errorMessage: "Gagal menandai pesanan sudah dihubungi",
  invalidates: ({ orderId }) => forOrder(orderId),
});

export const useBulkMarkContacted = createMutationHook({
  mutationFn: (data: {
    orderIds: string[];
    channel?: ContactChannel;
    note?: string;
  }) =>
    OrderService.bulkMarkContacted(data.orderIds, {
      channel: data.channel,
      note: data.note,
    }),
  successMessage: "Pesanan ditandai sudah dihubungi",
  errorMessage: "Gagal menandai pesanan sudah dihubungi",
  invalidates: forBulk,
});

export const useSetCustomerDecision = createMutationHook({
  mutationFn: (data: {
    orderId: string;
    decision: CustomerDecision;
    note?: string;
    replacementSku?: string;
    replacementItemId?: string;
  }) =>
    OrderService.setCustomerDecision(
      data.orderId,
      data.decision,
      data.note,
      data.replacementSku,
      data.replacementItemId,
    ),
  successMessage: "Keputusan pembeli tersimpan",
  errorMessage: "Gagal menyimpan keputusan pembeli",
  invalidates: ({ orderId }) => forOrder(orderId),
});

export const useUpdateOrderItem = createMutationHook({
  mutationFn: (data: {
    orderId: string;
    itemId: string;
    payload: UpdateOrderItemData;
  }) => OrderService.updateOrderItem(data.orderId, data.itemId, data.payload),
  successMessage: "Item pesanan diperbarui",
  errorMessage: "Gagal memperbarui item pesanan",
  invalidates: ({ orderId }) => forOrder(orderId),
});

export const useDownloadOrderItem = createMutationHook({
  mutationFn: (data: {
    orderId: string;
    itemId: string;
    variantId?: string;
  }) =>
    OrderService.downloadOrderItem(data.orderId, data.itemId, data.variantId),
  successMessage: "SKU berhasil di-download dan dipetakan",
  errorMessage: "Gagal download SKU",
  invalidates: ({ orderId }) => forOrder(orderId),
});

export const useDeleteOrderItem = createMutationHook({
  mutationFn: (data: { orderId: string; itemId: string }) =>
    OrderService.deleteOrderItem(data.orderId, data.itemId),
  successMessage: "Item pesanan dihapus",
  errorMessage: "Gagal menghapus item pesanan",
  invalidates: ({ orderId }) => forOrder(orderId),
});

export const useSaveCourierPickup = createMutationHook({
  mutationFn: (data: {
    orderId: string;
    courier_name?: string | null;
    courier_phone?: string | null;
    pickup_code?: string | null;
  }) =>
    OrderService.saveCourierPickup(data.orderId, {
      courier_name: data.courier_name,
      courier_phone: data.courier_phone,
      pickup_code: data.pickup_code,
    }),
  successMessage: "Bukti pickup kurir tersimpan",
  errorMessage: "Gagal menyimpan bukti pickup kurir",
  invalidates: ({ orderId }) => forOrder(orderId),
});

export const useUploadCourierIdPhoto = createMutationHook({
  mutationFn: (data: { orderId: string; file: File }) =>
    OrderService.uploadCourierIdPhoto(data.orderId, data.file),
  successMessage: "Foto identitas kurir diunggah",
  errorMessage: "Gagal mengunggah foto identitas kurir",
  invalidates: ({ orderId }) => forOrder(orderId),
});

export const useDeleteCourierIdPhoto = createMutationHook({
  mutationFn: (data: { orderId: string }) =>
    OrderService.deleteCourierIdPhoto(data.orderId),
  successMessage: "Foto identitas kurir dihapus",
  errorMessage: "Gagal menghapus foto identitas kurir",
  invalidates: ({ orderId }) => forOrder(orderId),
});
