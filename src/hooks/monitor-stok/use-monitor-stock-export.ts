"use client";

import { useMutation } from "@tanstack/react-query";

import { useAsyncExport } from "@/hooks/laporan/use-async-export";
import { MonitorStockService } from "@/services/monitor-stok/monitor-stok.service";
import type { MonitorStockExportParams } from "@/types/monitor-stok/monitor";

export function useMonitorStockExport() {
  const exportXlsx = useAsyncExport((params: MonitorStockExportParams) =>
    MonitorStockService.exportAsync(params),
    { autoDownload: true },
  );
  const exportPdf = useMutation({
    mutationFn: (params: MonitorStockExportParams) =>
      MonitorStockService.exportAsync(params),
  });

  return { exportXlsx, exportPdf };
}
