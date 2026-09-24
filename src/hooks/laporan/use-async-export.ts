"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiError } from "@/lib/toast";
import { subscribeRealtime } from "@/lib/realtime/sse-client";
import { ExportJobService } from "@/services/laporan/export-job.service";
import type { ExportJobStatus } from "@/types/laporan/export-job";

async function waitForExport(exportId: string): Promise<ExportJobStatus> {
  return ExportJobService.waitForCompletion(exportId);
}

function mimeTypeForFileName(fileName: string | null): string | undefined {
  const normalized = fileName?.toLowerCase() ?? "";
  if (normalized.endsWith(".csv")) return "text/csv;charset=utf-8";
  if (normalized.endsWith(".pdf")) return "application/pdf";
  return undefined;
}

/**
 * Hook generik untuk export asinkron. Secara default submit hanya memasukkan
 * job ke antrean agar user dapat melanjutkan pekerjaan dan mengunduhnya dari
 * Download Report. Alur lama yang membutuhkan auto-download dapat opt-in
 * dengan `{ autoDownload: true }`.
 */
export function useAsyncExport<TArgs = void>(
  trigger: (args: TArgs) => Promise<string>,
  options: { autoDownload?: boolean } = {},
) {
  const autoDownload = options.autoDownload ?? false;

  return useMutation({
    mutationFn: async (args: TArgs) => {
      const toastId = toast.loading("Menyiapkan berkas export…");

      try {
        const exportId = await trigger(args);

        if (!autoDownload) {
          toast.success("Export masuk antrean. Anda dapat melanjutkan pekerjaan.", {
            id: toastId,
            action: {
              label: "Buka Download Report",
              onClick: () => {
                window.location.href = "/dashboard/laporan/download";
              },
            },
          });

          window.dispatchEvent(new CustomEvent("report-export-queued", {
            detail: { exportId },
          }));

          subscribeRealtime({
            exportId,
            closeOnTerminal: true,
            onEvent: (event) => {
              if (event.type !== "export.progress") return;
              if (event.data.status !== "ready" && event.data.status !== "failed") return;
              window.dispatchEvent(new CustomEvent("report-export-updated", {
                detail: { exportId, status: event.data.status },
              }));
            },
          });

          return exportId;
        }

        const job = await waitForExport(exportId);

        if (job.status === "ready") {
          await ExportJobService.download(
            exportId,
            job.file_name ?? "export.xlsx",
            mimeTypeForFileName(job.file_name),
          );
          toast.success("Berkas export selesai diunduh.", { id: toastId });
          return;
        }

        throw new Error(job.error ?? "Gagal membuat berkas export.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Gagal membuat berkas export.",
          { id: toastId },
        );
        apiError(error, "Gagal membuat berkas export");
        throw error;
      }
    },
  });
}
