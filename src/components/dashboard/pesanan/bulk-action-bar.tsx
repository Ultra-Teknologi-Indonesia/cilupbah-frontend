"use client";

import { useState } from "react";
import {
  XIcon,
  PlayIcon,
  WarehouseIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  FileTextIcon,
  TruckIcon,
  BanIcon,
  PrinterIcon,
  CheckIcon,
  MessageCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { usePermissions } from "@/hooks/auth/use-permissions";
import type { Order, OrderTab, SubFilter } from "@/types/pesanan/order";
import type { PrintLabelOrderInput } from "@/components/dashboard/proses-pesanan/shared/print-label-size-dialog";
import {
  useBulkMarkContacted,
  useMarkComplete,
  useMoveToReady,
  useBulkAcceptCancelRequest,
  useBulkRejectCancelRequest,
  useBulkAcceptReturn,
  useBulkRejectReturn,
} from "@/hooks/pesanan/use-order-actions";
import { DocActions } from "@/hooks/proses-pesanan/use-doc-actions";
import { BulkRequestCancelDialog } from "./bulk-request-cancel-dialog";
import { BulkManualCancelDialog } from "./bulk-manual-cancel-dialog";
import { DirectCompletionDialog } from "./direct-completion-dialog";

export function BulkActionBar({
  tab,
  subFilter,
  count,
  onClear,
  selectedIds,
  selectedLabelInputs,
  selectedOrders,
}: {
  tab: OrderTab;
  subFilter: SubFilter;
  count: number;
  onClear: () => void;
  selectedIds?: string[];
  selectedLabelInputs?: PrintLabelOrderInput[];
  selectedOrders?: Order[];
}) {
  if (count === 0) return null;

  const label = `${count} pesanan dipilih`;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 py-2.5 shadow-xl shadow-black/10 dark:shadow-black/30">
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 rounded-full hover:bg-muted"
          onClick={onClear}
          aria-label="Batalkan pilihan"
        >
          <XIcon className="size-3.5" />
        </Button>

        <span className="text-sm font-medium tabular-nums">{label}</span>

        <Separator orientation="vertical" className="!h-5" />

        <TabBulkActions
          tab={tab}
          subFilter={subFilter}
          count={count}
          selectedIds={selectedIds ?? []}
          selectedLabelInputs={selectedLabelInputs ?? []}
          selectedOrders={selectedOrders ?? []}
          onDone={onClear}
        />
      </div>
    </div>
  );
}

function TabBulkActions({
  tab,
  subFilter,
  count,
  selectedIds,
  selectedLabelInputs,
  selectedOrders,
  onDone,
}: {
  tab: OrderTab;
  subFilter: SubFilter;
  count: number;
  selectedIds: string[];
  selectedLabelInputs: PrintLabelOrderInput[];
  selectedOrders: Order[];
  onDone: () => void;
}) {
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [bulkManualCancelOpen, setBulkManualCancelOpen] = useState(false);
  const [directCompleteOpen, setDirectCompleteOpen] = useState(false);
  const bulkContact = useBulkMarkContacted();
  const moveToReady = useMoveToReady();
  const markComplete = useMarkComplete();
  const acceptCancel = useBulkAcceptCancelRequest();
  const rejectCancel = useBulkRejectCancelRequest();
  const acceptReturn = useBulkAcceptReturn();
  const rejectReturn = useBulkRejectReturn();
  const { can } = usePermissions();
  const canEdit = can("edit-pesanan");
  const canEditReturn = can("edit-retur-penjualan");
  const canExportOrder = can("export-pesanan");
  const canExportShipping = can("export-pengiriman");

  const placeholder = (label: string) => () =>
    toast.info(`${label} untuk ${count} pesanan akan segera tersedia`);

  if (tab === "ready-to-process") {
    if (!canEdit) return null;
    return (
      <>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={moveToReady.isPending || selectedIds.length === 0}
          onClick={() =>
            moveToReady.mutate(selectedIds, { onSuccess: () => onDone() })
          }
        >
          <PlayIcon className="size-3.5" />
          {moveToReady.isPending ? "Memproses..." : "Proses Pesanan"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={placeholder("Edit Gudang")}
        >
          <WarehouseIcon className="size-3.5" />
          Edit Gudang
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={selectedIds.length === 0}
          onClick={() => setDirectCompleteOpen(true)}
        >
          <CheckCircleIcon className="size-3.5" />
          Selesaikan
        </Button>
        <DirectCompletionDialog
          open={directCompleteOpen}
          onOpenChange={setDirectCompleteOpen}
          orderIds={selectedIds}
          onDone={onDone}
        />
      </>
    );
  }

  if (tab === "in-transit") {
    return (
      <>
        {canExportShipping && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={selectedLabelInputs.length === 0}
            onClick={() => DocActions.shippingLabel(selectedLabelInputs)}
          >
            <PrinterIcon className="size-3.5" />
            Cetak Resi
          </Button>
        )}
        {canEdit && (
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={markComplete.isPending || selectedIds.length === 0}
            onClick={() =>
              markComplete.mutate(selectedIds, { onSuccess: () => onDone() })
            }
          >
            <CheckCircleIcon className="size-3.5" />
            {markComplete.isPending ? "Menyelesaikan..." : "Selesaikan"}
          </Button>
        )}
      </>
    );
  }

  if (tab === "completed") {
    if (!canExportOrder) return null;
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        disabled={selectedIds.length === 0}
        onClick={() => DocActions.invoice(selectedIds)}
      >
        <FileTextIcon className="size-3.5" />
        Cetak Faktur
      </Button>
    );
  }

  if (tab === "empty-stock" || tab === "failed-pick") {
    if (!canEdit) return null;
    return (
      <>
        {tab === "empty-stock" && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={bulkContact.isPending || selectedIds.length === 0}
            onClick={() =>
              bulkContact.mutate(
                { orderIds: selectedIds },
                { onSuccess: () => onDone() },
              )
            }
          >
            <MessageCircleIcon className="size-3.5" />
            Tandai Sudah Dihubungi
          </Button>
        )}
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={moveToReady.isPending || selectedIds.length === 0}
          onClick={() =>
            moveToReady.mutate(selectedIds, { onSuccess: () => onDone() })
          }
        >
          <ArrowRightIcon className="size-3.5" />
          {moveToReady.isPending
            ? "Memindahkan..."
            : "Pindahkan ke Siap Proses"}
        </Button>
      </>
    );
  }

  if (tab === "cancellation") {
    if (subFilter === "cancelled") return null;
    if (!canEdit) return null;
    const cancelBusy = acceptCancel.isPending || rejectCancel.isPending;
    return (
      <>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={cancelBusy || selectedIds.length === 0}
          onClick={() =>
            acceptCancel.mutate(selectedIds, { onSuccess: () => onDone() })
          }
        >
          <CheckIcon className="size-3.5" />
          {acceptCancel.isPending ? "Memproses..." : "Terima Pembatalan"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={cancelBusy || selectedIds.length === 0}
          onClick={() =>
            rejectCancel.mutate(selectedIds, { onSuccess: () => onDone() })
          }
        >
          <XIcon className="size-3.5" />
          {rejectCancel.isPending ? "Memproses..." : "Tolak Pembatalan"}
        </Button>
      </>
    );
  }

  if (tab === "returned") {
    if (subFilter === "accepted" || subFilter === "rejected") {
      if (!canExportOrder) return null;
      return (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={selectedIds.length === 0}
          onClick={() => DocActions.invoice(selectedIds)}
        >
          <FileTextIcon className="size-3.5" />
          Cetak Faktur
        </Button>
      );
    }
    if (!canEditReturn) return null;
    const returnBusy = acceptReturn.isPending || rejectReturn.isPending;
    return (
      <>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={returnBusy || selectedIds.length === 0}
          onClick={() =>
            acceptReturn.mutate(selectedIds, { onSuccess: () => onDone() })
          }
        >
          <CheckIcon className="size-3.5" />
          {acceptReturn.isPending ? "Memproses..." : "Terima Retur"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={returnBusy || selectedIds.length === 0}
          onClick={() =>
            rejectReturn.mutate(selectedIds, { onSuccess: () => onDone() })
          }
        >
          <XIcon className="size-3.5" />
          {rejectReturn.isPending ? "Memproses..." : "Tolak Retur"}
        </Button>
      </>
    );
  }

  if (tab === "all") {
    if (!canEdit) return null;
    return (
      <>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={placeholder("Kirim")}
        >
          <TruckIcon className="size-3.5" />
          Kirim
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
          onClick={() => setBulkCancelOpen(true)}
        >
          <BanIcon className="size-3.5" />
          Ajukan Pembatalan
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setBulkManualCancelOpen(true)}
        >
          <BanIcon className="size-3.5" />
          Batalkan Pesanan
        </Button>
        <BulkRequestCancelDialog
          open={bulkCancelOpen}
          onOpenChange={setBulkCancelOpen}
          orders={selectedOrders}
          onDone={onDone}
        />
        <BulkManualCancelDialog
          open={bulkManualCancelOpen}
          onOpenChange={setBulkManualCancelOpen}
          orders={selectedOrders}
          onDone={onDone}
        />
      </>
    );
  }

  return null;
}
