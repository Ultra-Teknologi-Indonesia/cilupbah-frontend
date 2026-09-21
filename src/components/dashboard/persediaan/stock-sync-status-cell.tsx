"use client";

import { useState } from "react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  HistoryIcon,
  Loader2Icon,
  RefreshCwIcon,
  SkipForwardIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useRetryStockSync,
  useStockSyncHistory,
} from "@/hooks/persediaan/use-inventory-sync";
import type {
  StockPushStatus,
  StockSyncState,
} from "@/hooks/persediaan/use-inventory-sync";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  StockPushStatus,
  {
    label: string;
    variant: "muted" | "info" | "success" | "destructive" | "warning";
    icon: typeof CheckCircle2Icon;
  }
> = {
  idle: { label: "Belum dikirim", variant: "muted", icon: SkipForwardIcon },
  processing: { label: "Diproses", variant: "info", icon: Loader2Icon },
  success: { label: "Berhasil", variant: "success", icon: CheckCircle2Icon },
  failed: { label: "Gagal", variant: "destructive", icon: AlertCircleIcon },
  skipped: { label: "Dilewati", variant: "warning", icon: SkipForwardIcon },
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function HistoryDialog({
  mappingId,
  itemCode,
  shopName,
  open,
  onOpenChange,
}: {
  mappingId: string;
  itemCode: string;
  shopName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading, isFetching } = useStockSyncHistory(
    open ? mappingId : null,
  );
  const items = data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Riwayat push stok</DialogTitle>
          <DialogDescription>
            {itemCode} · {shopName ?? "Toko channel"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2Icon className="mr-2 size-4 animate-spin" />
            Memuat riwayat…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Belum ada riwayat percobaan.
          </div>
        ) : (
          <ScrollArea className="max-h-[26rem] pr-3">
            <div className="space-y-2">
              {items.map((item) => {
                const meta = STATUS_META[
                  item.status === "success" ? "success" : item.status === "pending" ? "processing" : item.status
                ];
                const Icon = meta.icon;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/70 bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant={meta.variant}>
                        <Icon
                          className={cn(
                            "size-3",
                            meta.label === "Diproses" && "animate-spin",
                          )}
                        />
                        {meta.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    {item.errorMessage && (
                      <p className="mt-2 break-words text-sm text-destructive">
                        {item.errorMessage}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {isFetching && !isLoading && (
          <p className="text-xs text-muted-foreground">Memperbarui riwayat…</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function StockSyncStatusCell({
  mappingId,
  itemCode,
  shopName,
  stockSync,
  canEdit,
}: {
  mappingId: string;
  itemCode: string;
  shopName: string | null;
  stockSync: StockSyncState;
  canEdit: boolean;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const retry = useRetryStockSync();
  const meta = STATUS_META[stockSync.status];
  const Icon = meta.icon;
  const canRetry =
    canEdit && (stockSync.status === "failed" || stockSync.status === "skipped");
  const hasHistory =
    stockSync.attemptCount > 0 ||
    !!stockSync.lastError ||
    stockSync.status === "success";

  return (
    <div className="flex min-w-28 flex-col items-center gap-1">
      <Badge
        variant={meta.variant}
        title={stockSync.lastError ?? undefined}
        className="max-w-full text-2xs"
      >
        <Icon
          className={cn(
            "size-3",
            stockSync.status === "processing" && "animate-spin",
          )}
        />
        {meta.label}
      </Badge>

      {stockSync.lastError && stockSync.status === "failed" && (
        <span
          className="max-w-32 truncate text-2xs text-destructive"
          title={stockSync.lastError}
        >
          {stockSync.lastError}
        </span>
      )}

      <div className="flex items-center gap-1">
        {canRetry && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-6 rounded-full px-2 text-2xs"
            disabled={retry.isPending}
            onClick={() => retry.mutate(mappingId)}
          >
            {retry.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <RefreshCwIcon />
            )}
            Sync manual
          </Button>
        )}
        {hasHistory && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-6 rounded-full"
            aria-label={"Lihat riwayat push " + itemCode}
            title="Lihat riwayat"
            onClick={() => setHistoryOpen(true)}
          >
            <HistoryIcon />
          </Button>
        )}
      </div>

      {stockSync.nextAttemptAt && stockSync.status === "processing" && (
        <span className="text-2xs text-muted-foreground">
          Retry {formatDate(stockSync.nextAttemptAt)}
        </span>
      )}

      <HistoryDialog
        mappingId={mappingId}
        itemCode={itemCode}
        shopName={shopName}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
