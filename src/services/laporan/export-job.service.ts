import { fetchBlob, fetchBlobRaw, fetchClient } from "@/lib/api-client";
import { subscribeRealtime } from "@/lib/realtime/sse-client";
import type { ApiResponse } from "@/types/api.types";
import type { ExportJobStatus } from "@/types/laporan/export-job";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const SSE_MAX_WAIT_MS = 40 * 60_000;

function isTerminal(job: ExportJobStatus): boolean {
  return job.status === "ready" || job.status === "failed";
}

async function waitForExportCompletion(
  id: string,
  onProgress?: (message: string) => void,
): Promise<ExportJobStatus> {
  const initial = await ExportJobService.status(id);
  if (isTerminal(initial)) return initial;

  onProgress?.("Export sedang disiapkan di server…");

  return new Promise<ExportJobStatus>((resolve, reject) => {
    let settled = false;
    let unsubscribe: () => void = () => undefined;

    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
      callback();
    };

    const resolveTerminal = (job: ExportJobStatus): void => {
      if (!isTerminal(job)) return;
      finish(() => resolve(job));
    };

    const timeoutId = window.setTimeout(() => {
      // One final consistency read is intentional. This is not a polling loop
      // and covers a browser suspended while the export reached terminal state.
      void ExportJobService.status(id)
        .then((job) => {
          if (isTerminal(job)) {
            resolveTerminal(job);
            return;
          }

          finish(() =>
            reject(new Error("Export masih diproses. Silakan buka kembali riwayat export.")),
          );
        })
        .catch((error) => finish(() => reject(error)));
    }, SSE_MAX_WAIT_MS);

    unsubscribe = subscribeRealtime({
      exportId: id,
      closeOnTerminal: true,
      onEvent: (event) => {
        if (event.type !== "export.progress") return;

        const status = event.data.status;
        if (status !== "ready" && status !== "failed") return;

        resolveTerminal({
          id,
          type: typeof event.data.type === "string" ? event.data.type : "",
          status,
          file_name:
            typeof event.data.file_name === "string" ? event.data.file_name : null,
          error: typeof event.data.error === "string" ? event.data.error : null,
          download_url: null,
        });
      },
    });
  });
}

export const ExportJobService = {
  status: async (id: string): Promise<ExportJobStatus> => {
    const res = await fetchClient<ApiResponse<ExportJobStatus>>(
      `/reports/exports/${id}`,
    );
    return res.data;
  },

  download: (
    id: string,
    filename: string,
    mimeType = XLSX_MIME,
  ): Promise<void> =>
    fetchBlob(`/reports/exports/${id}/download`, filename, mimeType),

  downloadBlob: (id: string, mimeType: string): Promise<Blob> =>
    fetchBlobRaw(`/reports/exports/${id}/download`, mimeType),

  waitForCompletion: (id: string): Promise<ExportJobStatus> =>
    waitForExportCompletion(id),

  waitForBlob: async (
    id: string,
    mimeType: string,
    onProgress?: (message: string) => void,
  ): Promise<{ blob: Blob; fileName: string | null }> => {
    const job = await waitForExportCompletion(id, onProgress);

    if (job.status === "ready") {
      return {
        blob: await ExportJobService.downloadBlob(id, mimeType),
        fileName: job.file_name,
      };
    }

    throw new Error(job.error ?? "Gagal membuat berkas export.");
  },
};
