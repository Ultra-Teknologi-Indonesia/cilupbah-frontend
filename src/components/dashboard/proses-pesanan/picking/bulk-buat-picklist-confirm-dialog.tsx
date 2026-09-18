"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import type { FulfillmentOrder } from "@/types/proses-pesanan/fulfillment";

function pickableLines(order: FulfillmentOrder) {
  return order.items.flatMap((item) => {
    if (item.bundleComponents !== null) {
      return item.bundleComponents.map((component) => ({
        sku: component.sku ?? item.sku,
        qty: item.qty * component.qty,
      }));
    }

    return [{ sku: item.sku, qty: item.qty }];
  });
}

interface BulkBuatPicklistConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: FulfillmentOrder[];
  pickerName: string | null;
  pickerEmail: string | null;
  locationName: string | null;
  loading: boolean;
  onConfirm: () => void;
}

export function BulkBuatPicklistConfirmDialog({
  open,
  onOpenChange,
  selectedOrders,
  pickerName,
  pickerEmail,
  locationName,
  loading,
  onConfirm,
}: BulkBuatPicklistConfirmDialogProps) {
  const { totalSku, totalQty } = React.useMemo(() => {
    const skuSet = new Set<string>();
    let qty = 0;
    for (const order of selectedOrders) {
      for (const item of pickableLines(order)) {
        if (item.sku) skuSet.add(item.sku);
        qty += item.qty;
      }
    }
    return { totalSku: skuSet.size, totalQty: qty };
  }, [selectedOrders]);

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Jumlah Pesanan",
      value: (
        <span className="tabular-nums font-medium">
          {selectedOrders.length}
        </span>
      ),
    },
    {
      label: "Total SKU",
      value: <span className="tabular-nums font-medium">{totalSku}</span>,
    },
    {
      label: "Total Qty",
      value: <span className="tabular-nums font-medium">{totalQty}</span>,
    },
    {
      label: "Picker",
      value: (
        <div className="flex flex-col items-end">
          <span className="font-medium">{pickerName ?? "—"}</span>
          {pickerEmail && (
            <span className="text-xs text-muted-foreground">{pickerEmail}</span>
          )}
        </div>
      ),
    },
    {
      label: "Lokasi",
      value: <span className="font-medium">{locationName ?? "—"}</span>,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Konfirmasi Buat Picklist</DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow
                  key={row.label}
                  className={
                    idx < rows.length - 1 ? "border-b border-border" : undefined
                  }
                >
                  <TableHead
                    scope="row"
                    className="w-2/5 bg-muted/30 px-3 py-2.5 text-left align-top text-xs font-normal text-muted-foreground"
                  >
                    {row.label}
                  </TableHead>
                  <TableCell className="px-3 py-2.5 text-right align-top">
                    {row.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Batal
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2Icon className="animate-spin" />}
            Buat Picklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
