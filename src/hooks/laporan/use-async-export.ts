"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiError } from "@/lib/toast";
import { ExportJobService } from "@/services/laporan/export-job.service";

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 1600; // sampai sekitar 40 menit; pekerjaan berjalan di worker

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Hook generik untuk export asinkron: memicu job (trigger -> export_id),
 * mem-polling status sampai siap, lalu mengunduh berkasnya. Mengembalikan
 * mutation React Query biasa, jadi `mutate(params)` + `isPending` tetap sama
 * seperti export sinkron sebelumnya (drop-in untuk tombol export).
 */
export function useAsyncExport<TArgs = void>(
  trigger: (args: TArgs) => Promise<string>,
) {
  return useMutation({
    mutationFn: async (args: TArgs) => {
      const toastId = toast.loading("Menyiapkan berkas export…");

      try {
        const exportId = await trigger(args);

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          await sleep(POLL_INTERVAL_MS);
          const job = await ExportJobService.status(exportId);

          if (job.status === "ready") {
            await ExportJobService.download(
              exportId,
              job.file_name ?? "export.xlsx",
              job.file_name?.toLowerCase().endsWith(".csv")
                ? "text/csv;charset=utf-8"
                : undefined,
            );
            toast.success("Berkas export selesai diunduh.", { id: toastId });
            return;
          }

          if (job.status === "failed") {
            throw new Error(job.error ?? "Gagal membuat berkas export.");
          }
        }

        throw new Error("Export memakan waktu terlalu lama. Coba lagi.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal membuat berkas export.",
          { id: toastId },
        );
        apiError(error, "Gagal membuat berkas export");
        throw error;
      }
    },
  });
}
