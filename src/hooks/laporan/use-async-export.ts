"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { apiError } from "@/lib/toast";
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
 * Hook generik untuk export asinkron.
 *
 * Semua export tetap dimasukkan ke antrean agar request halaman tidak menunggu
 * proses report. Jika `autoDownload` aktif, mutation menunggu status terminal.
 * Jika tidak aktif, mutation langsung selesai setelah enqueue, tetapi listener
 * SSE tetap menunggu `ready` lalu mengunduh file satu kali secara otomatis.
 * Dengan begitu user boleh melanjutkan pekerjaan tanpa kehilangan hasil export.
 */
export function useAsyncExport<TArgs = void>(
  trigger: (args: TArgs) => Promise<string>,
  options: { autoDownload?: boolean } = {},
) {
  const router = useRouter();
  const autoDownload = options.autoDownload ?? false;

  return useMutation({
    mutationFn: async (args: TArgs) => {
      const toastId = toast.loading("Menyiapkan berkas export…");

      try {
        const exportId = await trigger(args);

        if (!autoDownload) {
          toast.success("Export masuk antrean. Anda dapat melanjutkan pekerjaan.", {
            id: toastId,
            duration: Infinity,
            action: {
              label: "Buka Download Report",
              onClick: () => {
                router.push("/dashboard/laporan/download");
              },
            },
          });

          window.dispatchEvent(new CustomEvent("report-export-queued", {
            detail: { exportId },
          }));

          // Keep the request non-blocking for the caller, but continue the
          // shared SSE-based wait in the background. This consumes the same
          // terminal event shown in DevTools and avoids interval polling.
          void waitForExport(exportId)
            .then(async (job) => {
              if (job.status === "ready" && job.file_available) {
                await ExportJobService.download(
                  exportId,
                  job.file_name ?? "export.xlsx",
                  mimeTypeForFileName(job.file_name),
                );
                toast.success("Berkas export selesai diunduh.", {
                  id: toastId,
                  duration: 5000,
                });
              } else {
                throw new Error(
                  job.status === "ready"
                    ? "Export sudah selesai, tetapi berkas belum tersedia untuk diunduh. Silakan coba lagi dari Download Report."
                    : (job.error ?? "Gagal membuat berkas export."),
                );
              }

              window.dispatchEvent(new CustomEvent("report-export-updated", {
                detail: { exportId, status: job.status },
              }));
            })
            .catch((error: unknown) => {
              const message = error instanceof Error
                ? error.message
                : "Gagal membuat berkas export.";
              toast.error(message, { id: toastId, duration: 8000 });
              window.dispatchEvent(new CustomEvent("report-export-updated", {
                detail: { exportId, status: "failed" },
              }));
            });

          return exportId;
        }

        const job = await waitForExport(exportId);

        if (job.status === "ready" && job.file_available) {
          await ExportJobService.download(
            exportId,
            job.file_name ?? "export.xlsx",
            mimeTypeForFileName(job.file_name),
          );
          toast.success("Berkas export selesai diunduh.", { id: toastId });
          return;
        }

        throw new Error(
          job.status === "ready"
            ? "Export sudah selesai, tetapi berkas belum tersedia untuk diunduh. Silakan coba lagi dari Download Report."
            : (job.error ?? "Gagal membuat berkas export."),
        );
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
