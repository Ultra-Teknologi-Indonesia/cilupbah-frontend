"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { ExportJobService } from "@/services/laporan/export-job.service";
import type {
  ExportJobListParams,
  ExportJobStatus,
} from "@/types/laporan/export-job";

export const exportJobKeys = {
  all: ["report-export-jobs"] as const,
  list: (params: ExportJobListParams) =>
    [...exportJobKeys.all, "list", params] as const,
};

export function useExportJobs(params: ExportJobListParams) {
  return useQuery({
    queryKey: exportJobKeys.list(params),
    queryFn: () => ExportJobService.list(params),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

function mimeTypeFor(format: ExportJobStatus["format"]): string {
  if (format === "pdf") return "application/pdf";
  if (format === "csv") return "text/csv;charset=utf-8";
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

export function useDownloadExportJob() {
  return useMutation({
    mutationFn: async (job: ExportJobStatus) => {
      if (!job.file_available || job.status !== "ready") {
        throw new Error(
          job.status === "expired"
            ? "Berkas export sudah kedaluwarsa. Buat export baru dari laporan asal."
            : "Berkas export belum siap diunduh.",
        );
      }

      await ExportJobService.download(
        job.id,
        job.file_name ?? `report-${job.id}.${job.format}`,
        mimeTypeFor(job.format),
      );
    },
    onSuccess: () => toast.success("Berkas report berhasil diunduh."),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Gagal mengunduh report."),
  });
}
