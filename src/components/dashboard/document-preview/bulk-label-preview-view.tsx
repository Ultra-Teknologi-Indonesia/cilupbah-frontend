"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  Loader2,
  PrinterIcon,
  RefreshCcwIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// eslint-disable-next-line no-restricted-imports
import { OutboundService } from "@/services/proses-pesanan/outbound.service";
import type {
  BulkLabelBatch,
  BulkLabelBatchItem,
} from "@/types/proses-pesanan/bulk-label";
import { bulkLabelRefetchInterval } from "@/lib/proses-pesanan/bulk-label-polling";
import { apiError } from "@/lib/toast";
import { notifyShippingLabelPrinted } from "@/lib/pesanan/shipping-label-audit-event";
import { cn } from "@/lib/utils";

const CHANNEL_LABEL: Record<string, string> = {
  shopee: "Shopee",
  tiktok: "TikTok",
  lazada: "Lazada",
  woocommerce: "WooCommerce",
  manual: "Manual",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function ItemRow({ item }: { item: BulkLabelBatchItem }) {
  const isInstant = item.is_instant || item.status === "skipped_instant";
  const isTransient =
    item.status === "pending" ||
    item.status === "downloading" ||
    item.status === "waiting_awb" ||
    item.status === "waiting_shopee_prep" ||
    item.status === "waiting_lazada_prep";

  return (
    <TableRow
      className={cn(
        isInstant && "bg-orange-500/5",
        item.status === "failed" && "bg-destructive/5",
      )}
    >
      <TableCell className="align-top">
        <div className="font-mono text-xs font-medium">
          {item.salesorder_no ?? item.order_id}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {CHANNEL_LABEL[item.channel] ?? item.channel}
        </div>
      </TableCell>
      <TableCell className="align-top text-xs">
        {item.no_paket ?? "—"}
      </TableCell>
      <TableCell className="align-top text-xs">
        {fmtDate(item.tgl_pesanan)}
      </TableCell>
      <TableCell className="align-top text-xs">
        {fmtDate(item.tgl_pengiriman)}
      </TableCell>
      <TableCell className="align-top text-xs">
        {item.courier_name ?? "—"}
      </TableCell>
      <TableCell className="align-top">
        {item.tracking_number ? (
          <span className="font-mono text-xs">{item.tracking_number}</span>
        ) : isTransient ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            <span>
              {item.status === "waiting_awb"
                ? "Menunggu resi dari marketplace…"
                : "Menunggu pembuatan label…"}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-col gap-1">
          <StatusBadge domain="bulk-label-item" status={item.status} />
          {item.status_message && (
            <span className="text-[11px] leading-snug text-muted-foreground">
              {item.status_message}
            </span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function BulkLabelPreviewView({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [retrying, setRetrying] = React.useState(false);
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [pdfError, setPdfError] = React.useState<unknown>(null);

  const { data, error, isLoading, refetch } = useQuery<BulkLabelBatch>({
    queryKey: ["bulk-label-batch", batchId],
    queryFn: () => OutboundService.getBulkShippingLabelBatch(batchId),
    refetchInterval: (query) =>
      bulkLabelRefetchInterval(query.state.data?.status),
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const isReady = data?.status === "ready";

  React.useEffect(() => {
    if (!isReady) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    OutboundService.downloadBulkShippingLabelPdf(batchId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
        setPdfError(null);
        notifyShippingLabelPrinted(
          (data?.items ?? [])
            .filter((item) => item.status === "done")
            .map((item) => item.order_id),
        );
      })
      .catch((downloadError: unknown) => {
        if (!cancelled) {
          setPdfError(downloadError);
          apiError(downloadError, "Gagal memuat PDF label.");
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [batchId, data?.items, isReady]);

  const handleRetry = async (hasRetryable: boolean) => {
    setRetrying(true);
    try {
      if (!hasRetryable) {
        await refetch();
        return;
      }

      await OutboundService.retryFailedBulkShippingLabels(batchId);
      toast.success("Mencoba ulang pesanan yang gagal...");
      setPdfUrl(null);
      setPdfError(null);
      await refetch();
    } catch (err) {
      apiError(err, "Gagal mencoba ulang.");
    } finally {
      setRetrying(false);
    }
  };

  const handlePrint = () => {
    if (!data || !pdfUrl) return;

    const iframe = document.getElementById(
      "bulk-label-frame",
    ) as HTMLIFrameElement | null;
    iframe?.contentWindow?.print();
    notifyShippingLabelPrinted(
      data.items
        .filter((item) => item.status === "done")
        .map((item) => item.order_id),
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">Memuat status batch…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-destructive">
        <XCircleIcon className="size-8" />
        <p className="text-sm">Gagal memuat status batch.</p>
      </div>
    );
  }

  const isFailed = data.status === "failed";
  const isProcessing = data.status === "processing";
  const skipped = data.skipped ?? 0;
  const waitingAwb =
    data.waiting_awb ??
    data.items.filter((i) => i.status === "waiting_awb").length;
  const retryableCount =
    data.retryable_count ??
    data.items.filter((i) => i.status === "failed" && i.is_retryable).length;
  const canPrint = isReady && !!pdfUrl && !pdfError;
  const anyDone = data.done > 0;

  return (
    <div className="flex h-full min-h-screen flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          {isProcessing && (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          )}
          {isReady && <CheckCircle2Icon className="size-5 text-success" />}
          {isFailed && (
            <AlertTriangleIcon className="size-5 text-destructive" />
          )}
          <div>
            <p className="text-sm font-semibold">
              {isProcessing && "Mengambil No. Resi…"}
              {isReady && !pdfUrl && !pdfError && "Menyiapkan PDF resi…"}
              {isReady && pdfUrl && "Resi siap dicetak"}
              {isReady && Boolean(pdfError) && "PDF resi gagal dimuat"}
              {isFailed && !anyDone && "Semua item gagal"}
              {isFailed && anyDone && "Sebagian selesai"}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.done}/{data.total} berhasil
              {skipped > 0 && ` · ${skipped} dilewati (instant courier)`}
              {data.failed > 0 && ` · ${data.failed} gagal`}
              {waitingAwb > 0 && ` · ${waitingAwb} menarik No. Resi`}
              {data.waiting_shopee > 0 &&
                ` · ${data.waiting_shopee} menunggu Shopee`}
            </p>
            {isProcessing && (
              <p className="text-xs text-muted-foreground">
                Status dipantau otomatis. Klik Coba Lagi jika ingin menjalankan
                ulang proses secara manual.
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(retryableCount > 0 || isProcessing) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRetry(retryableCount > 0)}
              disabled={retrying}
              className="rounded-full"
            >
              {retrying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCcwIcon className="size-4" />
              )}
              {retryableCount > 0
                ? `Coba Lagi (${retryableCount})`
                : "Coba Lagi"}
            </Button>
          )}
          {canPrint && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrint}
                className="rounded-full"
              >
                <PrinterIcon className="size-4" />
                Cetak
              </Button>
              <Button asChild size="sm" className="rounded-full">
                <a href={pdfUrl!} download={`labels-${batchId}.pdf`}>
                  <DownloadIcon className="size-4" />
                  Unduh PDF
                </a>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="rounded-full"
              >
                <a href={pdfUrl!} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon className="size-4" />
                  Buka
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      {canPrint ? (
        <div className="flex-1 bg-muted/40">
          <iframe
            id="bulk-label-frame"
            src={pdfUrl}
            className="h-[calc(100vh-4rem)] w-full border-0"
            title="Label pengiriman"
            onLoad={() =>
              notifyShippingLabelPrinted(
                data.items
                  .filter((item) => item.status === "done")
                  .map((item) => item.order_id),
              )
            }
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-4 py-4">
          <Table containerClassName="rounded-xl border border-border/60">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>No. Pesanan</TableHead>
                <TableHead>No. Paket</TableHead>
                <TableHead>Tgl. Pesanan</TableHead>
                <TableHead>Tgl. Pengiriman</TableHead>
                <TableHead>Kurir</TableHead>
                <TableHead>No. Resi</TableHead>
                <TableHead>Status Pengambilan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <ItemRow key={item.id ?? item.order_id} item={item} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
