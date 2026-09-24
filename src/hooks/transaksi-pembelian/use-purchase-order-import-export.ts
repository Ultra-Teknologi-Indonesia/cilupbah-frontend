import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAsyncExport } from "@/hooks/laporan/use-async-export";
import { PurchaseOrderService } from "@/services/transaksi-pembelian/purchase-order.service";
import type {
  PurchaseImportPreview,
  PurchaseImportConfirmResult,
} from "@/types/transaksi-pembelian/purchase-order-import";
import type { PurchaseOrderListParams } from "@/types/transaksi-pembelian/purchase-order";

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function useImportPurchaseOrderPreview() {
  return useMutation<PurchaseImportPreview, Error, File>({
    mutationFn: (file: File) => PurchaseOrderService.previewImport(file),
  });
}

export function useImportPurchaseOrderConfirm() {
  const queryClient = useQueryClient();
  return useMutation<PurchaseImportConfirmResult, Error, { token: string }>({
    mutationFn: ({ token }) => PurchaseOrderService.confirmImport(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });
}

export async function downloadPurchaseOrderTemplate() {
  const blob = await PurchaseOrderService.downloadImportTemplate();
  triggerBlobDownload(blob, "template-import-pesanan-pembelian.xlsx");
}

export function usePurchaseOrderListExport() {
  return useAsyncExport(
    (params: PurchaseOrderListParams = {}) => PurchaseOrderService.exportListAsync(params),
    { autoDownload: true },
  );
}

export function usePurchaseOrderDetailExport() {
  return useAsyncExport(
    (params: PurchaseOrderListParams = {}) => PurchaseOrderService.exportDetailAsync(params),
    { autoDownload: true },
  );
}
