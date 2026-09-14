"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiError } from "@/lib/toast";
import { PurchaseOrderService } from "@/services/transaksi-pembelian/purchase-order.service";
import { InboundService } from "@/services/barang-masuk/inbound.service";
import type {
  PurchaseOrderListParams,
  PurchaseOrderPatchData,
} from "@/types/transaksi-pembelian/purchase-order";

const STALE = 30 * 1000;

export function usePurchaseOrders(params: PurchaseOrderListParams = {}) {
  return useQuery({
    queryKey: ["purchase-order", "list", params],
    placeholderData: keepPreviousData,
    queryFn: () => PurchaseOrderService.list(params),
    staleTime: STALE,
  });
}

export function usePurchaseOrderDetail(id?: string) {
  return useQuery({
    queryKey: ["purchase-order", "detail", id],
    queryFn: () => PurchaseOrderService.getById(id!),
    enabled: !!id,
    staleTime: STALE,
  });
}

export function usePurchaseOrderItems(
  id?: string,
  params: {
    page: number;
    perPage: number;
    search?: string;
    sort?: string;
  } = { page: 1, perPage: 20 },
) {
  return useQuery({
    queryKey: ["purchase-order", "items", id, params],
    placeholderData: keepPreviousData,
    queryFn: () => PurchaseOrderService.getItems(id!, params),
    enabled: !!id,
    staleTime: STALE,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: PurchaseOrderService.create,
    onSuccess: () => {
      toast.success("Pesanan pembelian berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["purchase-order"] });
    },
    onError: (err) => apiError(err, "Gagal membuat pesanan"),
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PurchaseOrderPatchData }) =>
      PurchaseOrderService.patch(id, data),
    onSuccess: () => {
      toast.success("Pesanan pembelian berhasil diperbarui");
      qc.invalidateQueries({ queryKey: ["purchase-order"] });
    },
    onError: (err) => apiError(err, "Gagal memperbarui pesanan"),
  });
}

export function useBulkDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: PurchaseOrderService.bulkDelete,
    onSuccess: () => {
      toast.success("Pesanan terpilih berhasil dihapus");
      qc.invalidateQueries({ queryKey: ["purchase-order"] });
    },
    onError: (err) => apiError(err, "Gagal menghapus pesanan"),
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: PurchaseOrderService.delete,
    onSuccess: () => {
      toast.success("Pesanan berhasil dihapus");
      qc.invalidateQueries({ queryKey: ["purchase-order"] });
    },
    onError: (err) => apiError(err, "Gagal menghapus pesanan"),
  });
}

export function useRecreateInboundForPO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (poId: string) => InboundService.receiveAdditional(poId),
    onSuccess: () => {
      toast.success("Penerimaan barang berhasil dibuat ulang");
      qc.invalidateQueries({ queryKey: ["purchase-order"] });
      qc.invalidateQueries({ queryKey: ["inbound"] });
    },
    onError: (err) => apiError(err, "Gagal membuat ulang penerimaan barang"),
  });
}
