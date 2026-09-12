"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  Loader2,
  PrinterIcon,
  RefreshCcwIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { apiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { notifyShippingLabelPrinted } from "@/lib/pesanan/shipping-label-audit-event";

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
      <TableCell className="align-top font-medium whitespace-nowrap">
        <div className="font-mono text-xs font-semibold">
          {item.salesorder_no ?? item.order_id}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {CHANNEL_LABEL[item.channel] ?? item.channel}
        </div>
      </TableCell>
      <TableCell className="align-top text-xs whitespace-nowrap">
        {item.no_paket ?? "—"}
      </TableCell>
      <TableCell className="align-top text-xs whitespace-nowrap">
        {fmtDate(item.tgl_pesanan)}
      </TableCell>
      <TableCell className="align-top text-xs whitespace-nowrap">
        {fmtDate(item.tgl_pengiriman)}
      </TableCell>
      <TableCell className="align-top text-xs font-medium whitespace-nowrap">
        {item.courier_name ?? "—"}
      </TableCell>
      <TableCell className="align-top whitespace-nowrap">
        {item.tracking_number ? (
          <span className="font-mono text-xs font-semibold text-foreground">
            {item.tracking_number}
          </span>
        ) : isTransient ? (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <Loader2 className="size-3.5 animate-spin" />
            <span className="text-[11px] font-medium">
              {item.status === "waiting_awb" ? "Menarik resi…" : "Mengambil…"}
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

export type DocumentSize = "thermal_100x150" | "thermal_100x120";

export interface AmbilNoResiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderIds?: string[];
  initialBatchId?: string | null;
  documentSize?: DocumentSize;
}

export function AmbilNoResiDialog({
  open,
  onOpenChange,
  orderIds = [],
  initialBatchId = null,
  documentSize = "thermal_100x120",
}: AmbilNoResiDialogProps) {
  const [activeBatchId, setActiveBatchId] = React.useState<string | null>(
    initialBatchId,
  );
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);
  const [printing, setPrinting] = React.useState(false);

  // When dialog opens, create batch if not already present
  React.useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveBatchId(null);
      return;
    }

    if (initialBatchId) {
      setActiveBatchId(initialBatchId);
      return;
    }

    if (orderIds.length > 0 && !activeBatchId) {
      let isMounted = true;
      setIsInitializing(true);

      OutboundService.createBulkShippingLabelBatch(orderIds, documentSize)
        .then((res) => {
          if (isMounted) {
            setActiveBatchId(res.batch_id);
          }
        })
        .catch((err) => {
          if (isMounted) {
            apiError(err, "Gagal memulai penarikan resi.");
            onOpenChange(false);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsInitializing(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [
    open,
    initialBatchId,
    orderIds,
    documentSize,
    activeBatchId,
    onOpenChange,
  ]);

  const { data, error, isLoading, refetch } = useQuery<BulkLabelBatch>({
    queryKey: ["bulk-label-batch", activeBatchId],
    queryFn: () => OutboundService.getBulkShippingLabelBatch(activeBatchId!),
    enabled: open && !isInitializing && !!activeBatchId,
    refetchInterval: (query) =>
      query.state.data?.status === "processing" ? 2000 : false,
  });

  const handleRetry = async (hasRetryable: boolean) => {
    if (!activeBatchId) return;
    setRetrying(true);
    try {
      if (!hasRetryable) {
        await refetch();
        return;
      }

      const res =
        await OutboundService.retryFailedBulkShippingLabels(activeBatchId);
      toast.success("Berhasil membuat batch coba lagi.");
      setActiveBatchId(res.batch_id);
    } catch (err) {
      apiError(err, "Gagal mencoba ulang penarikan resi.");
    } finally {
      setRetrying(false);
    }
  };

  const handlePrintLabel = async () => {
    if (!activeBatchId || !data || data.status !== "ready") return;

    // Open synchronously from the click handler so popup blockers do not
    // reject the tab while the authenticated blob request is in flight.
    const printWindow = window.open("about:blank", "_blank");
    if (!printWindow) {
      toast.error("Popup diblokir browser. Izinkan popup untuk mencetak label.");
      return;
    }

    printWindow.opener = null;
    setPrinting(true);

    try {
      const blob = await OutboundService.downloadBulkShippingLabelPdf(
        activeBatchId,
      );
      const objectUrl = URL.createObjectURL(blob);
      printWindow.location.replace(objectUrl);

      // Keep the object URL alive long enough for the new tab/PDF viewer to
      // load it, then release it to avoid accumulating browser memory.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      notifyShippingLabelPrinted(
        data.items
          .filter((item) => item.status === "done")
          .map((item) => item.order_id),
      );
    } catch (err) {
      printWindow.close();
      apiError(err, "Gagal membuka label resi.");
    } finally {
      setPrinting(false);
    }
  };

  const isReady = data?.status === "ready";
  const isFailed = data?.status === "failed";
  const isProcessing = data?.status === "processing" || isInitializing;
  const skipped = data?.skipped ?? 0;
  const waitingAwb =
    data?.waiting_awb ??
    data?.items?.filter((i) => i.status === "waiting_awb").length ??
    0;
  const retryableCount =
    data?.retryable_count ??
    data?.items?.filter((i) => i.status === "failed" && i.is_retryable)
      .length ??
    0;
  const canPrint = isReady && !!data?.pdf_url && !printing;
  const anyDone = (data?.done ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(90vh,860px)] w-[96vw] max-w-[96vw] sm:max-w-[96vw] md:max-w-6xl xl:max-w-7xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isProcessing && (
                <Loader2 className="size-5 animate-spin text-primary" />
              )}
              {isReady && <CheckCircle2Icon className="size-5 text-success" />}
              {isFailed && (
                <AlertTriangleIcon className="size-5 text-destructive" />
              )}
              <div>
                <DialogTitle className="text-base font-semibold">
                  Ambil No. Resi
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {isProcessing &&
                    "Sedang menarik nomor resi dari marketplace…"}
                  {isReady &&
                    "Seluruh nomor resi siap dan label dapat dicetak."}
                  {isFailed && !anyDone && "Penarikan nomor resi gagal."}
                  {isFailed &&
                    anyDone &&
                    "Sebagian nomor resi berhasil ditarik."}
                </DialogDescription>
              </div>
            </div>

            {data && (
              <div className="text-right">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted border border-border/60">
                  Total: {data.total}
                </span>
              </div>
            )}
          </div>

          {data && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/40">
              <span className="font-medium text-foreground">
                {data.done}/{data.total} Berhasil
              </span>
              {waitingAwb > 0 && (
                <span className="text-primary font-medium">
                  · {waitingAwb} Menarik No. Resi
                </span>
              )}
              {data.waiting_shopee > 0 && (
                <span className="text-warning font-medium">
                  · {data.waiting_shopee} Menunggu Shopee
                </span>
              )}
              {skipped > 0 && (
                <span className="text-orange-500 font-medium">
                  · {skipped} Dilewati (Kurir Instan)
                </span>
              )}
              {data.failed > 0 && (
                <span className="text-destructive font-medium">
                  · {data.failed} Gagal
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[260px]">
          {isInitializing || (isLoading && !data) ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm">Menghubungkan ke marketplace…</p>
            </div>
          ) : error && !data ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-destructive">
              <XCircleIcon className="size-8" />
              <p className="text-sm">Gagal memuat daftar resi.</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Coba Lagi
              </Button>
            </div>
          ) : data?.items && data.items.length > 0 ? (
            <Table containerClassName="rounded-xl border border-border/60">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[200px] whitespace-nowrap">
                    No. Pesanan
                  </TableHead>
                  <TableHead className="w-[180px] whitespace-nowrap">
                    No. Paket
                  </TableHead>
                  <TableHead className="w-[140px] whitespace-nowrap">
                    Tgl. Pesanan
                  </TableHead>
                  <TableHead className="w-[140px] whitespace-nowrap">
                    Tgl. Pengiriman
                  </TableHead>
                  <TableHead className="w-[150px] whitespace-nowrap">
                    Kurir
                  </TableHead>
                  <TableHead className="w-[180px] whitespace-nowrap">
                    No. Resi
                  </TableHead>
                  <TableHead className="min-w-[200px]">
                    Status Pengambilan
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <ItemRow key={item.id ?? item.order_id} item={item} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Tidak ada pesanan untuk diproses.
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-3.5 border-t border-border/60 bg-muted/10 flex-row items-center justify-between sm:justify-between gap-2">
          <div>
            {(retryableCount > 0 || (isProcessing && !isInitializing)) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRetry(retryableCount > 0)}
                disabled={retrying}
                className="rounded-full gap-1.5"
              >
                {retrying ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCcwIcon className="size-3.5" />
                )}
                <span>
                  {retryableCount > 0
                    ? `Coba Lagi (${retryableCount})`
                    : "Coba Lagi"}
                </span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              Tutup
            </Button>

            <Button
              size="sm"
              onClick={handlePrintLabel}
              disabled={!canPrint}
              className="rounded-full gap-1.5"
            >
              {printing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PrinterIcon className="size-4" />
              )}
              <span>{printing ? "Menyiapkan label…" : "Cetak Label Pengiriman"}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
