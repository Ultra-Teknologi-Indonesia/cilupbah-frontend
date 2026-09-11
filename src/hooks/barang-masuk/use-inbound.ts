"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  InboundService,
  type InboundReceiptsParams,
} from "@/services/barang-masuk/inbound.service";
import type { InboundListParams } from "@/types/barang-masuk/inbound";
import { apiError } from "@/lib/toast";
import { invalidateStockViews } from "@/lib/stock-cache";

const STALE = 30 * 1000;

export function useInbounds(
  params: InboundListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["inbound", "list", params],
    placeholderData: keepPreviousData,
    queryFn: () => InboundService.list(params),
    staleTime: STALE,
    enabled: options.enabled ?? true,
  });
}

export function useInboundDetail(id?: string, opts: { pollMs?: number } = {}) {
  return useQuery({
    queryKey: ["inbound", "detail", id],
    queryFn: () => InboundService.getById(id!),
    enabled: !!id,
    staleTime: STALE,
    refetchInterval: opts.pollMs ?? false,
  });
}

export function useInboundItems(
  id?: string,
  params: {
    page: number;
    perPage: number;
    search?: string;
    sort?: string;
  } = { page: 1, perPage: 20 },
) {
  return useQuery({
    queryKey: ["inbound", "items", id, params],
    placeholderData: keepPreviousData,
    queryFn: () => InboundService.getItems(id!, params),
    enabled: !!id,
    staleTime: STALE,
  });
}

export function useInboundReceipts(
  id?: string,
  params: InboundReceiptsParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["inbound", "receipts", id, params],
    placeholderData: keepPreviousData,
    queryFn: () => InboundService.getReceipts(id!, params),
    enabled: !!id && (options.enabled ?? true),
    staleTime: STALE,
  });
}

export function useFinalizeInbound(inboundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => InboundService.finalize(inboundId),
    onSuccess: () => {
      toast.success("Berhasil menyelesaikan penerimaan");
      qc.invalidateQueries({ queryKey: ["inbound", "detail", inboundId] });
      qc.invalidateQueries({ queryKey: ["inbound", "items", inboundId] });
      qc.invalidateQueries({ queryKey: ["inbound", "receipts", inboundId] });
      qc.invalidateQueries({ queryKey: ["inbound", "list"] });
    },
    onError: (err) => apiError(err, "Gagal menyelesaikan penerimaan"),
  });
}

export function useCorrectReceivedLines(inboundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { item_id: string; qty?: number }[]) =>
      InboundService.correctReceivedLines(inboundId, items),
    onSuccess: () => {
      toast.success("Penerimaan dikoreksi, stok dikembalikan dari bin inbound");
      qc.invalidateQueries({ queryKey: ["inbound", "detail", inboundId] });
      qc.invalidateQueries({ queryKey: ["inbound", "list"] });
      invalidateStockViews(qc);
    },
    onError: (err) => apiError(err, "Gagal mengoreksi penerimaan"),
  });
}

export function useBulkCancelInbounds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => InboundService.bulkCancel(ids),
    onSuccess: (res) => {
      const failed = res?.failed?.length ?? 0;
      const ok = res?.cancelled?.length ?? 0;
      if (failed > 0) {
        const details = (res?.failed ?? [])
          .map((item) => {
            const number = item.transaction_number?.trim();
            const message = item.message?.trim() || "Tidak ada detail kegagalan.";
            return number ? `${number}: ${message}` : message;
          })
          .filter(Boolean)
          .join(" • ");

        toast.warning(`${ok} penerimaan dihapus, ${failed} gagal`, {
          description: details || "Tidak ada detail kegagalan dari server.",
          duration: 10000,
        });
      } else {
        toast.success(`${ok} penerimaan dihapus`);
      }
      qc.invalidateQueries({ queryKey: ["inbound", "list"] });
      invalidateStockViews(qc);
      qc.invalidateQueries({ queryKey: ["outbound-transfer"] });
      qc.invalidateQueries({ queryKey: ["purchase-order"] });
    },
    onError: (err) => apiError(err, "Gagal menghapus penerimaan"),
  });
}

export function useSetReceivedQty(inboundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      qty,
      expectedUpdatedAt,
    }: {
      itemId: string;
      qty: number;
      expectedUpdatedAt?: string | null;
    }) =>
      InboundService.setReceivedQty(inboundId, itemId, qty, expectedUpdatedAt),
    onSuccess: () => {
      toast.success("Jumlah diterima diperbarui");
      qc.invalidateQueries({ queryKey: ["inbound", "detail", inboundId] });
      qc.invalidateQueries({ queryKey: ["inbound", "items", inboundId] });
      qc.invalidateQueries({ queryKey: ["inbound", "list"] });
      invalidateStockViews(qc);
    },
    onError: (err: unknown) => {
      const code = (err as { errors?: { code?: string } })?.errors?.code;
      if (code === "STALE_WRITE") {
        qc.invalidateQueries({ queryKey: ["inbound", "detail", inboundId] });
        qc.invalidateQueries({ queryKey: ["inbound", "items", inboundId] });
      }
      apiError(err, "Gagal memperbarui jumlah diterima");
    },
  });
}

export function useSetDiscrepancyNote(inboundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, note }: { itemId: string; note: string | null }) =>
      InboundService.setDiscrepancyNote(inboundId, itemId, note),
    onSuccess: () => {
      toast.success("Berhasil menyimpan catatan");
      qc.invalidateQueries({ queryKey: ["inbound", "detail", inboundId] });
      qc.invalidateQueries({ queryKey: ["inbound", "items", inboundId] });
    },
    onError: (err) => apiError(err, "Gagal menyimpan catatan"),
  });
}

export function useUnassignInbound(inboundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      reason_code: string;
      reason_note?: string;
      new_assignee_id?: string;
    }) => InboundService.unassign(inboundId, payload),
    onSuccess: (_data, vars) => {
      toast.success(
        vars.new_assignee_id
          ? "Tugas berhasil dialihkan"
          : "Assignment berhasil dibatalkan",
      );
      qc.invalidateQueries({ queryKey: ["inbound", "detail", inboundId] });
      qc.invalidateQueries({ queryKey: ["inbound", "list"] });
    },
    onError: (err) => apiError(err, "Gagal mengalihkan tugas"),
  });
}

export function useResetInboundAssignment(inboundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { reason_note: string; new_assignee_id?: string }) =>
      InboundService.resetAssignment(inboundId, payload),
    onSuccess: () => {
      toast.success("Penerimaan berhasil di-reset");
      qc.invalidateQueries({ queryKey: ["inbound", "detail", inboundId] });
      qc.invalidateQueries({ queryKey: ["inbound", "items", inboundId] });
      qc.invalidateQueries({ queryKey: ["inbound", "list"] });
      invalidateStockViews(qc);
    },
    onError: (err) => apiError(err, "Gagal reset penerimaan"),
  });
}

export function useWithdrawParticipant(inboundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { userId: string; reasonNote?: string }) =>
      InboundService.withdrawParticipant(
        inboundId,
        payload.userId,
        payload.reasonNote,
      ),
    onSuccess: () => {
      toast.success("Peserta ditarik dari sesi");
      qc.invalidateQueries({ queryKey: ["inbound", "detail", inboundId] });
    },
    onError: (err) => apiError(err, "Gagal menarik peserta"),
  });
}

export function useReceiveAdditional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (poId: string) => InboundService.receiveAdditional(poId),
    onSuccess: () => {
      toast.success("Penerimaan susulan dibuat");
      qc.invalidateQueries({ queryKey: ["inbound", "list"] });
      qc.invalidateQueries({ queryKey: ["purchase-order"] });
    },
    onError: (err) => apiError(err, "Gagal membuat penerimaan susulan"),
  });
}

export function useSetReceivedQtyBatch(inboundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      items,
      expectedUpdatedAt,
    }: {
      items: Array<{ itemId: string; qty: number }>;
      expectedUpdatedAt?: string | null;
    }): Promise<Array<{ itemId: string; ok: boolean; error?: string }>> => {
      const results = await Promise.allSettled(
        items.map((it) =>
          InboundService.setReceivedQty(
            inboundId,
            it.itemId,
            it.qty,
            expectedUpdatedAt,
          ),
        ),
      );
      return items.map((it, idx) => {
        const r = results[idx];
        if (r.status === "fulfilled") return { itemId: it.itemId, ok: true };
        return {
          itemId: it.itemId,
          ok: false,
          error: (r.reason as { message?: string })?.message,
        };
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["inbound", "detail", inboundId] });
      qc.invalidateQueries({ queryKey: ["inbound", "items", inboundId] });
      qc.invalidateQueries({ queryKey: ["inbound", "list"] });
      invalidateStockViews(qc);
    },
  });
}
