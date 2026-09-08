"use client";

import { useAsyncExport } from "@/hooks/laporan/use-async-export";
import { DaftarPelangganService } from "@/services/laporan/daftar-pelanggan.service";

export function useExportCustomerList() {
  return useAsyncExport((params: { from: string; to: string; format?: "excel" | "pdf" }) =>
    DaftarPelangganService.exportCustomerList(params),
  );
}
