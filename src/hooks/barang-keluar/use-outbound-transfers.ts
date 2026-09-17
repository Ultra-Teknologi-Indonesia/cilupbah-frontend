"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { OutboundTransferService } from "@/services/barang-keluar/outbound-transfer.service";
import type { InventoryTransferListParams } from "@/types/barang-masuk/inventory-transfer";
import type { BulkTransferDeleteResult } from "@/services/barang-keluar/outbound-transfer.service";
import type {
  CreateTransferDraftPayload,
  AddTransferItemPayload,
} from "@/services/barang-keluar/outbound-transfer.service";
import { apiError } from "@/lib/toast";
import { invalidateStockViews } from "@/lib/stock-cache";

const STALE = 30 * 1000;

export const importTransferTemplateUrl = (): string =>
  OutboundTransferService.importTemplateUrl();

export const downloadImportTransferTemplate = (): Promise<void> =>
  OutboundTransferService.downloadTemplate();

export function useImportTransferPreview() {
  return useMutation({
    mutationFn: (file: File) => OutboundTransferService.importPreview(file),
    onError: (err) => apiError(err, "Gagal memuat pratinjau import"),
  });
}

export function useImportTransferConfirm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ token, createdBy }: { token: string; createdBy: string }) =>
      OutboundTransferService.importConfirm(token, createdBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outbound-transfer"] });
    },
    onError: (err) => apiError(err, "Gagal menerapkan import"),
  });
}

export function useOutboundDrafts(params: InventoryTransferListParams = {}) {
  return useQuery({
    queryKey: ["outbound-transfer", "drafts", params],
    queryFn: () => OutboundTransferService.listDrafts(params),
    staleTime: STALE,
  });
}

export function useOutboundApproved(params: InventoryTransferListParams = {}) {
  return useQuery({
    queryKey: ["outbound-transfer", "approved", params],
    queryFn: () => OutboundTransferService.listApproved(params),
    staleTime: STALE,
  });
}

export function useOutboundTransit(params: InventoryTransferListParams = {}) {
  return useQuery({
    queryKey: ["outbound-transfer", "transit", params],
    queryFn: () => OutboundTransferService.listTransit(params),
    staleTime: STALE,
  });
}

export function useOutboundFinished(params: InventoryTransferListParams = {}) {
  return useQuery({
    queryKey: ["outbound-transfer", "finished", params],
    queryFn: () => OutboundTransferService.listFinished(params),
    staleTime: STALE,
  });
}

export function useOutboundTransferDetail(id?: string) {
  return useQuery({
    queryKey: ["outbound-transfer", "detail", id],
    queryFn: () => OutboundTransferService.getById(id!),
    enabled: !!id,
    staleTime: STALE,
  });
}

export function useCreateTransferDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransferDraftPayload) =>
      OutboundTransferService.createDraft(data),
    onSuccess: () => {
      toast.success("Draft transfer berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["outbound-transfer"] });
    },
    onError: (err) => apiError(err, "Gagal membuat draft"),
  });
}

export function useAddTransferItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddTransferItemPayload }) =>
      OutboundTransferService.addItem(id, data),
    onSuccess: () => {
      toast.success("Item berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["outbound-transfer"] });
    },
    onError: (err) => apiError(err, "Gagal menambah item"),
  });
}

export function useRemoveTransferItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemId }: { id: string; itemId: string }) =>
      OutboundTransferService.removeItem(id, itemId),
    onSuccess: () => {
      toast.success("Item berhasil dihapus");
      qc.invalidateQueries({ queryKey: ["outbound-transfer"] });
    },
    onError: (err) => apiError(err, "Gagal menghapus item"),
  });
}

export function useApproveTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { approved_by: string; assigned_to?: number };
    }) => OutboundTransferService.approve(id, data),
    onSuccess: () => {
      toast.success("Transfer berhasil di-approve");
      qc.invalidateQueries({ queryKey: ["outbound-transfer"] });
      invalidateStockViews(qc);
    },
    onError: (err) => apiError(err, "Gagal approve transfer"),
  });
}

export function useSubmitDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => OutboundTransferService.submitDraft(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outbound-transfer", "drafts"] });
      qc.invalidateQueries({ queryKey: ["outbound-transfer", "transit"] });
      invalidateStockViews(qc);
    },
  });
}

export function useRevertToDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => OutboundTransferService.revertToDraft(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outbound-transfer"] });
      invalidateStockViews(qc);
    },
    onError: (err) =>
      apiError(err, "Gagal mengembalikan transfer ke Baru Dibuat"),
  });
}

export function useShipTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { shipped_by: string } }) =>
      OutboundTransferService.ship(id, data),
    onSuccess: () => {
      toast.success("Transfer berhasil dikirim — stok telah dikurangi");
      qc.invalidateQueries({ queryKey: ["outbound-transfer"] });
      invalidateStockViews(qc);
    },
  });
}

export function usePrepareBulkTransferPrint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, shippedBy }: { ids: string[]; shippedBy: string }) =>
      OutboundTransferService.prepareBulkForPrint(ids, shippedBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outbound-transfer"] });
      invalidateStockViews(qc);
    },
  });
}

export function useCancelTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { cancelled_by: string; cancel_reason?: string };
    }) => OutboundTransferService.cancel(id, data),
    onSuccess: () => {
      toast.success("Transfer berhasil dibatalkan");
      qc.invalidateQueries({ queryKey: ["outbound-transfer"] });
      invalidateStockViews(qc);
    },
    onError: (err) => apiError(err, "Gagal membatalkan transfer"),
  });
}

export function useDeleteTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => OutboundTransferService.delete(id),
    onSuccess: () => {
      toast.success("Transfer berhasil dihapus");
      qc.invalidateQueries({ queryKey: ["outbound-transfer"] });
      invalidateStockViews(qc);
    },
    onError: (err) => apiError(err, "Gagal menghapus transfer"),
  });
}

export function useBulkDeleteTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => OutboundTransferService.bulkDelete(ids),
    onSuccess: (data: BulkTransferDeleteResult) => {
      const parts: string[] = [];
      if (data.deleted > 0) parts.push(`${data.deleted} dihapus`);
      if (data.reverted > 0)
        parts.push(`${data.reverted} dikembalikan ke Baru Dibuat`);
      if (data.failed.length > 0) parts.push(`${data.failed.length} gagal`);
      const message = parts.join(", ") || "Tidak ada transfer diproses";
      if (data.failed.length > 0) {
        toast.warning(message);
      } else {
        toast.success(message);
      }
      qc.invalidateQueries({ queryKey: ["outbound-transfer"] });
      invalidateStockViews(qc);
    },
    onError: (err) => apiError(err, "Gagal memproses transfer"),
  });
}

export function useBulkPdfTransferAsync() {
  return useMutation({
    mutationFn: (ids: string[]) => OutboundTransferService.bulkPdfAsync(ids),
  });
}

export function useMarkTransferPrinted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { transfer_id: string; printed_by: string }) =>
      OutboundTransferService.markPrinted(data),
    onSuccess: () => {
      toast.success("Transfer ditandai sudah dicetak");
      qc.invalidateQueries({ queryKey: ["outbound-transfer"] });
    },
    onError: (err) => apiError(err, "Gagal menandai cetak"),
  });
}
