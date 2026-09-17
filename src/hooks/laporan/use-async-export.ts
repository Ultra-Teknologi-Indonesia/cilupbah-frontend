"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiError } from "@/lib/toast";
import { subscribeRealtime } from "@/lib/realtime/sse-client";
import { ExportJobService } from "@/services/laporan/export-job.service";
import type { ExportJobStatus } from "@/types/laporan/export-job";

const FALLBACK_POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 480; // fallback maksimal sekitar 40 menit
const SSE_MAX_WAIT_MS = 40 * 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForExportBySse(exportId: string): Promise<ExportJobStatus> {
  return new Promise<ExportJobStatus>((resolve, reject) => {
    let settled = false;
    let unsubscribe: () => void = () => undefined;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
      callback();
    };

    const handleStatus = (job: ExportJobStatus) => {
      if (job.status === "ready") finish(() => resolve(job));
      if (job.status === "failed") {
        finish(() => reject(new Error(job.error ?? "Export gagal diproses.")));
      }
    };

    const timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error("SSE export timeout.")));
    }, SSE_MAX_WAIT_MS);

    const subscribe = () => {
      unsubscribe = subscribeRealtime({
        exportId,
        closeOnTerminal: true,
        onEvent: (event) => {
          if (event.type !== "export.progress") return;

          const status = event.data.status;
          if (status !== "ready" && status !== "failed") return;

          handleStatus({
            id: exportId,
            type: String(event.data.type ?? ""),
            status,
            file_name:
              typeof event.data.file_name === "string"
                ? event.data.file_name
                : null,
            error:
              typeof event.data.error === "string" ? event.data.error : null,
            download_url: null,
          });
        },
        onError: (error) => finish(() => reject(error)),
      });

      // Close the race between the first snapshot and opening SSE. This is a
      // one-time consistency check, not a polling loop.
      void ExportJobService.status(exportId)
        .then(handleStatus)
        .catch((error) => finish(() => reject(error)));
    };

    // Avoid opening a long-lived SSE connection for a job that already
    // finished before the browser reached this code path.
    void ExportJobService.status(exportId)
      .then((job) => {
        if (job.status === "ready" || job.status === "failed") {
          handleStatus(job);
          return;
        }

        subscribe();
      })
      .catch((error) => finish(() => reject(error)));
  });
}

async function waitForExportByFallbackPolling(
  exportId: string,
): Promise<ExportJobStatus> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    await sleep(FALLBACK_POLL_INTERVAL_MS);
    const job = await ExportJobService.status(exportId);
    if (job.status === "ready" || job.status === "failed") return job;
  }

  throw new Error("Export memakan waktu terlalu lama. Coba lagi.");
}

async function waitForExport(exportId: string): Promise<ExportJobStatus> {
  try {
    return await waitForExportBySse(exportId);
  } catch (error) {
    // SSE is the primary path. The slower REST fallback preserves export
    // functionality during a proxy/Redis deployment issue.
    if (error instanceof Error && error.message !== "SSE export timeout.") {
      try {
        const snapshot = await ExportJobService.status(exportId);
        if (snapshot.status === "ready" || snapshot.status === "failed") {
          return snapshot;
        }
      } catch {
        // Let the fallback poll surface the final transport error.
      }
    }

    return waitForExportByFallbackPolling(exportId);
  }
}

/**
 * Hook generik untuk export asinkron: memicu job (trigger -> export_id),
 * menunggu event SSE sampai siap, lalu mengunduh berkasnya. Mengembalikan
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

        const job = await waitForExport(exportId);

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
