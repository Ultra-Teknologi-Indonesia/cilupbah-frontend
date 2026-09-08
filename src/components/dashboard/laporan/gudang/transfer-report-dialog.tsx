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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ProductPickerCombobox } from "@/components/dashboard/laporan/shared/product-picker-combobox";
import { ReportFormatRadio, type ReportFormat } from "@/components/dashboard/laporan/shared/report-format-radio";
import { useExportTransferReport } from "@/hooks/laporan/use-laporan-gudang";
import type { TransferReportJenis } from "@/types/laporan/laporan-gudang";

interface TransferReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JENIS_OPTIONS: { value: TransferReportJenis; label: string }[] = [
  { value: "masuk", label: "Transfer Masuk" },
  { value: "keluar", label: "Transfer Keluar" },
];

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

export function TransferReportDialog({
  open,
  onOpenChange,
}: TransferReportDialogProps) {
  const [jenis, setJenis] = React.useState<TransferReportJenis>("masuk");
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    startOfMonth(),
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());
  const [itemIds, setItemIds] = React.useState<string[]>([]);
  const [format, setFormat] = React.useState<ReportFormat>("excel");

  const exportTransfer = useExportTransferReport();

  function handleOpenChange(next: boolean) {
    if (!next) {
      setJenis("masuk");
      setStartDate(startOfMonth());
      setEndDate(new Date());
      setItemIds([]);
      setFormat("excel");
    }
    onOpenChange(next);
  }

  const invalidRange = Boolean(
    startDate && endDate && endDate.getTime() < startDate.getTime(),
  );
  const canCetak =
    Boolean(startDate && endDate) && !invalidRange && !exportTransfer.isPending;

  async function handleCetak() {
    if (!startDate || !endDate || invalidRange) return;
    try {
      await exportTransfer.mutateAsync({
        jenis,
        from: formatDateISO(startDate),
        to: formatDateISO(endDate),
        item_ids: itemIds.length ? itemIds : undefined,
        format,
      });
      toast.success("Berhasil mengunduh laporan transfer");
      handleOpenChange(false);
    } catch (error) {
      apiError(error, "Gagal mengunduh laporan transfer");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer</DialogTitle>
          <DialogDescription>
            Daftar barang transfer masuk atau keluar dalam rentang tanggal.
            Kosongkan SKU untuk semua barang.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <ReportFormatRadio value={format} onChange={setFormat} />
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              Jenis Laporan
            </Label>
            <RadioGroup
              value={jenis}
              onValueChange={(v) => setJenis(v as TransferReportJenis)}
              className="grid grid-cols-2 gap-2"
            >
              {JENIS_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm transition-colors",
                    jenis === o.value
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem value={o.value} />
                  {o.label}
                </label>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {jenis === "masuk"
                ? "Disaring menurut tanggal barang diterima."
                : "Disaring menurut tanggal barang dikirim."}
            </p>
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

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              SKU (opsional)
            </Label>
            <ProductPickerCombobox
              mode="sku"
              value={itemIds}
              onChange={setItemIds}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleCetak} disabled={!canCetak}>
            {exportTransfer.isPending ? (
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
