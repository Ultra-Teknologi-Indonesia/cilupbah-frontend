"use client";

import * as React from "react";
import { DownloadIcon, Loader2, PrinterIcon } from "lucide-react";

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
import { DatePicker } from "@/components/ui/date-picker";
import { ProductPickerCombobox } from "@/components/dashboard/laporan/shared/product-picker-combobox";
import { LocationMultiCombobox } from "@/components/dashboard/laporan/shared/location-multi-combobox";
import { ReportFormatRadio, type ReportFormat } from "@/components/dashboard/laporan/shared/report-format-radio";
import { useAsyncExport } from "@/hooks/laporan/use-async-export";
import { ReportService } from "@/services/laporan/report.service";

interface PenyesuaianReportDialogProps {
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

export function PenyesuaianReportDialog({
  open,
  onOpenChange,
}: PenyesuaianReportDialogProps) {
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    startOfMonth(),
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());
  const [productIds, setProductIds] = React.useState<string[]>([]);
  const [locationIds, setLocationIds] = React.useState<string[]>([]);
  const [format, setFormat] = React.useState<ReportFormat>("pdf");
  const exportReport = useAsyncExport(ReportService.penyesuaianStokExportAsync);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setStartDate(startOfMonth());
      setEndDate(new Date());
      setProductIds([]);
      setLocationIds([]);
      setFormat("pdf");
    }
    onOpenChange(next);
  }

  const invalidRange = Boolean(
    startDate && endDate && endDate.getTime() < startDate.getTime(),
  );
  const canCetak = Boolean(startDate && endDate) && !invalidRange && !exportReport.isPending;

  function handleCetak() {
    if (!startDate || !endDate || invalidRange) return;
    exportReport.mutate(
      {
        start_date: formatDateISO(startDate),
        end_date: formatDateISO(endDate),
        product_ids: productIds.length ? productIds : undefined,
        location_ids: locationIds.length ? locationIds : undefined,
        format,
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cetak Daftar Penyesuaian Stok</DialogTitle>
          <DialogDescription>
            Pilih rentang tanggal. Produk dan lokasi opsional — kosongkan untuk
            semua.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <ReportFormatRadio value={format} onChange={setFormat} />
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

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              Produk (opsional)
            </Label>
            <ProductPickerCombobox
              mode="sku"
              value={productIds}
              onChange={setProductIds}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              Lokasi (opsional)
            </Label>
            <LocationMultiCombobox
              value={locationIds}
              onChange={setLocationIds}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleCetak} disabled={!canCetak}>
            {exportReport.isPending ? <Loader2 className="size-4 animate-spin" /> : format === "pdf" ? <PrinterIcon className="size-4" /> : <DownloadIcon className="size-4" />}
            {exportReport.isPending ? "Menyiapkan..." : format === "pdf" ? "Unduh PDF" : "Unduh Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
