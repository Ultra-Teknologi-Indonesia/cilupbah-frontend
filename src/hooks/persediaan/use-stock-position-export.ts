"use client";

import { useAsyncExport } from "@/hooks/laporan/use-async-export";
import { InventoryStockService } from "@/services/persediaan/inventory.service";
import type { StockPositionExportParams } from "@/types/persediaan/stock";

export function useStockPositionExport() {
  const exportCsv = useAsyncExport((params: StockPositionExportParams) =>
    InventoryStockService.exportPositionAsync(params),
    { autoDownload: true },
  );
  const exportPdf = useAsyncExport((params: StockPositionExportParams) =>
    InventoryStockService.exportPositionAsync(params),
    { autoDownload: true },
  );

  return { exportCsv, exportPdf };
}
