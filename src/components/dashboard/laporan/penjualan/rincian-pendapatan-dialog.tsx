"use client";

import * as React from "react";
import { DownloadIcon, Loader2, PrinterIcon } from "lucide-react";
import { toast } from "sonner";
import { apiError } from "@/lib/toast";

import { cn } from "@/lib/utils";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DatePicker } from "@/components/ui/date-picker";
import { SkuMultiComboboxLazy } from "@/components/dashboard/laporan/shared/sku-multi-combobox-lazy";
import { ReportFormatRadio, type ReportFormat } from "@/components/dashboard/laporan/shared/report-format-radio";
import { useExportRincianPendapatan } from "@/hooks/laporan/use-rincian-pendapatan";
import type { RincianPendapatanMode } from "@/types/laporan/rincian-pendapatan";

interface RincianPendapatanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODE_OPTIONS: { value: RincianPendapatanMode; label: string }[] = [
  { value: "rincian", label: "Rincian Pendapatan" },
  { value: "per_barang", label: "Rincian Pendapatan per Barang" },
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

export function RincianPendapatanDialog({
  open,
  onOpenChange,
}: RincianPendapatanDialogProps) {
  const [jenis, setJenis] = React.useState<RincianPendapatanMode>("rincian");
  const [itemIds, setItemIds] = React.useState<string[]>([]);
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    startOfMonth(),
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());
  const [format, setFormat] = React.useState<ReportFormat>("excel");
  const exportXlsx = useExportRincianPendapatan();

  function handleOpenChange(next: boolean) {
    if (!next) {
      setJenis("rincian");
      setItemIds([]);
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
        jenis,
        from: formatDateISO(startDate),
        to: formatDateISO(endDate),
        item_ids:
          jenis === "per_barang" && itemIds.length ? itemIds : undefined,
        format,
      },
      {
        onSuccess: () => {
          toast.success("Berhasil mengunduh rincian pendapatan");
          handleOpenChange(false);
        },
        onError: (error) => apiError(error, "Gagal mengunduh rincian pendapatan"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rincian Pendapatan</DialogTitle>
          <DialogDescription>
            Rincian pendapatan berikut HPP dan laba kotor — per faktur atau per
            barang, dalam format Excel atau PDF.
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
              onValueChange={(v) => setJenis(v as RincianPendapatanMode)}
              className="grid grid-cols-1 gap-2"
            >
              {MODE_OPTIONS.map((o) => (
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

          {jenis === "per_barang" && (
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">
                Barang (opsional, bisa lebih dari satu)
              </Label>
              <SkuMultiComboboxLazy value={itemIds} onChange={setItemIds} />
            </div>
          )}
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
