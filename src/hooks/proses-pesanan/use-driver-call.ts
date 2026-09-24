"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiError } from "@/lib/toast";
import { fulfillmentKeys } from "@/hooks/proses-pesanan/use-fulfillment";
import { OutboundService } from "@/services/proses-pesanan/outbound.service";

type LabelResult = {
  type: string;
  url?: string;
  document_base64?: string;
  content_type?: string;
  source?: string;
};

export type PrintWithDriverCallResult = {
  driver_call_status: "pending" | "success" | "failed";
  driver_call_message: string | null;
  driver_call_attempted_at: string | null;
  label: LabelResult | null;
  label_preparing?: boolean;
  label_error?: string;

  driver_call_forced?: boolean;
};

function isDriverCallFailure(err: unknown): boolean {
  const body = err as {
    message?: unknown;
    errors?: Record<string, unknown> | null;
  } | null;
  if (body?.errors && typeof body.errors === "object") {
    if (body.errors.driver_call_status === "failed") return true;
  }
  return (
    typeof body?.message === "string" && body.message.includes("force_label")
  );
}

export function usePrintWithDriverCall() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      orderId: string;
      documentType?: string;
      documentSize?: string;
      forceLabel?: boolean;
    }): Promise<PrintWithDriverCallResult> => {
      const call = (force?: boolean) =>
        OutboundService.printWithDriverCall(data.orderId, {
          document_type: data.documentType,
          document_size: data.documentSize,
          force_label: force ?? data.forceLabel,
        });

      try {
        return await call();
      } catch (err) {
        if (!data.forceLabel && isDriverCallFailure(err)) {
          const forced = await call(true);
          return { ...forced, driver_call_forced: true };
        }
        throw err;
      }
    },
    onSuccess: (result, variables) => {
      if (result.label) {
        window.open(
          `/dashboard/document-preview/shipping-label/${variables.orderId}`,
          "_blank",
          "noopener,noreferrer",
        );
      } else if (result.label_preparing) {
        toast.warning(
          "Permintaan marketplace diterima. Resi/label masih disiapkan; driver belum dikonfirmasi.",
        );
      } else if (result.label_error) {
        toast.warning(
          `Driver terpanggil. Label gagal diambil: ${result.label_error}`,
        );
      }

      if (result.driver_call_status === "success") {
        toast.success("Driver marketplace berhasil dipanggil.");
      } else if (
        result.driver_call_forced ||
        result.driver_call_status === "failed"
      ) {
        toast.warning(
          `Driver tidak bisa dipanggil${result.driver_call_message ? `: ${result.driver_call_message}` : ""}. Label tetap dicetak.`,
        );
      }

      qc.invalidateQueries({ queryKey: fulfillmentKeys.all });
      qc.invalidateQueries({ queryKey: ["pesanan"] });
    },
    onError: (err) => {
      apiError(err, "Panggilan driver marketplace gagal.");
    },
  });
}

export function useRetryDriverCall() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => OutboundService.retryDriverCall(orderId),
    onSuccess: () => {
      toast.success("Panggilan driver Shopee dicoba ulang.");
      qc.invalidateQueries({ queryKey: fulfillmentKeys.all });
      qc.invalidateQueries({ queryKey: ["pesanan"] });
    },
    onError: (err) => {
      apiError(err, "Gagal retry panggilan driver.");
    },
  });
}

export function useShipmentTrackingEvents(shipmentId: string, enabled = true) {
  return useQuery({
    queryKey: ["shipment-tracking-events", shipmentId],
    queryFn: () => OutboundService.shipmentTrackingEvents(shipmentId),
    enabled: enabled && !!shipmentId,
    refetchInterval: 30_000,
  });
}

export function useRefreshShipmentTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) =>
      OutboundService.refreshShipmentTracking(shipmentId),
    onSuccess: (_d, shipmentId) => {
      toast.success("Tracking driver diperbarui.");
      qc.invalidateQueries({
        queryKey: ["shipment-tracking-events", shipmentId],
      });
      qc.invalidateQueries({ queryKey: fulfillmentKeys.all });
    },
    onError: (err) => {
      apiError(err, "Gagal memperbarui tracking driver.");
    },
  });
}

export function useCallInstantDriverBulk() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      shipperId: string | number;
      orderIds?: string[];
      shipmentIds?: string[];
    }) =>
      OutboundService.callInstantDriverBulk({
        shipper_id: payload.shipperId,
        order_ids: payload.orderIds,
        shipment_ids: payload.shipmentIds,
      }),
    onSuccess: (result) => {
      const successCount = result.summary.success;
      const pendingCount = result.summary.pending ?? 0;
      const failedCount = result.summary.failed.length;
      if (failedCount === 0 && pendingCount === 0) {
        toast.success(
          `Sukses memanggil kurir instan untuk ${successCount} pesanan.`,
        );
      } else if (successCount === 0 && pendingCount > 0 && failedCount === 0) {
        toast.warning(
          `${pendingCount} pesanan diterima marketplace, tetapi resi masih disiapkan. Driver belum dikonfirmasi.`,
        );
      } else if (successCount === 0) {
        toast.error(
          `Gagal memanggil kurir instan untuk ${failedCount} pesanan.`,
        );
      } else {
        toast.warning(
          `${successCount} sukses, ${pendingCount} masih menunggu resi, ${failedCount} gagal — cek detail per pesanan.`,
        );
      }
      qc.invalidateQueries({ queryKey: fulfillmentKeys.all });
      qc.invalidateQueries({ queryKey: ["pesanan"] });
    },
    onError: (err) => {
      apiError(err, "Gagal memanggil kurir instan.");
    },
  });
}
