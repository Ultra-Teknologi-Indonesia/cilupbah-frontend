"use client";

import * as React from "react";
import { DownloadIcon, Loader2, PrinterIcon } from "lucide-react";
import { toast } from "sonner";
import { apiError } from "@/lib/toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { LocationMultiCombobox } from "@/components/dashboard/laporan/shared/location-multi-combobox";
import { SkuMultiComboboxLazy } from "@/components/dashboard/laporan/shared/sku-multi-combobox-lazy";
import { ReportFormatRadio, type ReportFormat } from "@/components/dashboard/laporan/shared/report-format-radio";
import { useExportSalesProduct } from "@/hooks/laporan/use-laporan-produk";

interface PenjualanProdukDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function PenjualanProdukDialog({
  open,
  onOpenChange,
}: PenjualanProdukDialogProps) {
  const [itemIds, setItemIds] = React.useState<string[]>([]);
  const [pickLocation, setPickLocation] = React.useState(false);
  const [locationIds, setLocationIds] = React.useState<string[]>([]);
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    startOfMonth(),
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());
  const [format, setFormat] = React.useState<ReportFormat>("excel");
  const exportXlsx = useExportSalesProduct();

  function handleOpenChange(next: boolean) {
    if (!next) {
      setItemIds([]);
      setPickLocation(false);
      setLocationIds([]);
      setStartDate(startOfMonth());
      setEndDate(new Date());
      setFormat("excel");
    }
    onOpenChange(next);
  }

  const invalidRange = Boolean(
    startDate && endDate && endDate.getTime() < startDate.getTime(),
  );
  const canCetak =
    Boolean(startDate && endDate) && !invalidRange && !exportXlsx.isPending;

  function handleCetak() {
    if (!startDate || !endDate || invalidRange) return;

    exportXlsx.mutate(
      {
        from: formatDateISO(startDate),
        to: formatDateISO(endDate),
        item_ids: itemIds.length ? itemIds : undefined,
        location_ids:
          pickLocation && locationIds.length ? locationIds : undefined,
        format,
      },
      {
        onSuccess: () => {
          toast.success("Berhasil mengunduh laporan penjualan produk");
          handleOpenChange(false);
        },
        onError: (error) => apiError(error, "Gagal mengunduh laporan penjualan produk"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Penjualan Produk</DialogTitle>
          <DialogDescription>
            Penjualan per produk (1 baris per barang pesanan).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <ReportFormatRadio value={format} onChange={setFormat} />
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              SKU (opsional, bisa lebih dari satu)
            </Label>
            <SkuMultiComboboxLazy value={itemIds} onChange={setItemIds} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">
                Tanggal Mulai
              </Label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Pilih tanggal"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">
                Tanggal Akhir
              </Label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="Pilih tanggal"
              />
            </div>
          </div>
          {invalidRange && (
            <p className="text-xs text-destructive">
              Tanggal akhir harus setelah atau sama dengan tanggal mulai.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Switch
                id="produk-pilih-lokasi"
                checked={pickLocation}
                onCheckedChange={(v) => {
                  setPickLocation(v);
                  if (!v) setLocationIds([]);
                }}
              />
              <Label htmlFor="produk-pilih-lokasi" className="text-sm">
                Pilih Lokasi
              </Label>
            </div>
            {pickLocation && (
              <LocationMultiCombobox
                value={locationIds}
                onChange={setLocationIds}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleCetak} disabled={!canCetak}>
            {exportXlsx.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              format === "excel" ? <DownloadIcon className="size-4" /> : <PrinterIcon className="size-4" />
            )}
            {format === "excel" ? "Unduh Excel" : "Unduh PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
