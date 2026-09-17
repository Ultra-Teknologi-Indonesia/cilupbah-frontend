"use client";

import {
  PlusIcon,
  PrinterIcon,
  Trash2Icon,
  TruckIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface FulfillmentBulkActionBarProps {
  selectedCount: number;
  onReset: () => void;
  onReadyToShip?: () => void;
  onCreateShipment?: () => void;
  onPrintLabel?: () => void;
  onPrintInvoice?: () => void;
  onPrintInvoiceAndLabel?: () => void;
  onDelete?: () => void;
  readyToShipDisabled?: string;
  createShipmentDisabled?: string;
  printLabelDisabled?: string;
  printInvoiceDisabled?: string;
}

export function FulfillmentBulkActionBar({
  selectedCount,
  onReset,
  onReadyToShip,
  onCreateShipment,
  onPrintLabel,
  onPrintInvoice,
  onPrintInvoiceAndLabel,
  onDelete,
  readyToShipDisabled,
  createShipmentDisabled,
  printLabelDisabled,
  printInvoiceDisabled,
}: FulfillmentBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-full border border-border/60 bg-background/95 px-3 py-1.5 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={onReset}
        className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Batalkan pilihan"
        title="Batalkan pilihan"
      >
        <XIcon className="size-4" />
      </button>

      <span className="text-sm font-medium text-foreground">
        {selectedCount} Pesanan terpilih
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {onReadyToShip && (
          <Button
            size="sm"
            onClick={onReadyToShip}
            disabled={!!readyToShipDisabled}
            title={readyToShipDisabled}
            className="rounded-full gap-1.5"
          >
            <TruckIcon className="size-4" />
            Siap Kirim
          </Button>
        )}

        {onCreateShipment && (
          <Button
            size="sm"
            variant="primary"
            onClick={onCreateShipment}
            disabled={!!createShipmentDisabled}
            title={createShipmentDisabled}
            className="rounded-full gap-1.5"
          >
            <PlusIcon className="size-4" />
            Buat Pengiriman
          </Button>
        )}

        {onPrintLabel && (
          <Button
            size="sm"
            variant={onReadyToShip ? "outline" : "default"}
            onClick={onPrintLabel}
            disabled={!!printLabelDisabled}
            title={printLabelDisabled}
            className="rounded-full gap-1.5"
          >
            <PrinterIcon className="size-4" />
            Cetak Label Pengiriman
          </Button>
        )}

        {onPrintInvoice && (
          <Button
            size="sm"
            variant="outline"
            onClick={onPrintInvoice}
            disabled={!!printInvoiceDisabled}
            title={printInvoiceDisabled}
            className="rounded-full"
          >
            Cetak Faktur
          </Button>
        )}

        {onPrintInvoiceAndLabel && (
          <Button
            size="sm"
            variant="outline"
            onClick={onPrintInvoiceAndLabel}
            className="rounded-full"
          >
            Faktur & Label
          </Button>
        )}

        {onDelete && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2Icon className="size-4" />
            Hapus Pesanan
          </Button>
        )}
      </div>
    </div>
  );
}
