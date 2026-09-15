"use client";

import * as React from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBulkCancelManualOrder } from "@/hooks/pesanan/use-order-actions";
import type { Order } from "@/types/pesanan/order";

interface BulkManualCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
  onDone?: () => void;
}

export function isManualOrder(order: Order): boolean {
  return (
    !order.source ||
    order.source.toLowerCase() === "manual" ||
    order.source.toLowerCase() === "offline"
  );
}

export function BulkManualCancelDialog({
  open,
  onOpenChange,
  orders,
  onDone,
}: BulkManualCancelDialogProps) {
  const [reason, setReason] = React.useState<string>("");

  const eligible = React.useMemo(() => orders.filter(isManualOrder), [orders]);

  const bulkCancel = useBulkCancelManualOrder();

  const handleOpenChange = (next: boolean) => {
    if (!next) setReason("");
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (eligible.length === 0) return;
    bulkCancel.mutate(
      { orderIds: eligible.map((o) => o.id), reason },
      {
        onSuccess: () => {
          handleOpenChange(false);
          onDone?.();
        },
      },
    );
  };

  const hasError = eligible.length === 0;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Batalkan Pesanan Manual"
      description={
        hasError
          ? "Tidak ada pesanan manual dari pilihan ini yang dapat dibatalkan."
          : `Anda akan membatalkan secara langsung ${eligible.length} pesanan manual. Proses ini akan otomatis mengembalikan stok ke status tersedia dan mencabut pesanan dari antrean gudang.`
      }
      confirmLabel="Batalkan Pesanan"
      variant="destructive"
      loading={bulkCancel.isPending}
      confirmDisabled={hasError}
      onConfirm={handleConfirm}
    >
      {!hasError && (
        <div className="space-y-4 py-2">
          {eligible.length < orders.length && (
            <p className="text-xs text-muted-foreground">
              {orders.length - eligible.length} pesanan dilewati (bukan pesanan
              manual).
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="reason">Alasan Pembatalan (Opsional)</Label>
            <Input
              id="reason"
              placeholder="Contoh: Permintaan pembeli, stok habis fisik"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
      )}
    </ConfirmDialog>
  );
}
