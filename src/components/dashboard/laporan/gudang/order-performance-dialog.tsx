"use client";

import * as React from "react";
import { DownloadIcon, Loader2, PrinterIcon } from "lucide-react";

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
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LocationMultiCombobox } from "@/components/dashboard/laporan/shared/location-multi-combobox";
import {
  ReportFormatRadio,
  type ReportFormat,
} from "@/components/dashboard/laporan/shared/report-format-radio";
import { useExportOrderPerformance } from "@/hooks/laporan/use-laporan-gudang";
import type {
  OrderPerformanceJenis,
  OrderPerformanceMode,
} from "@/types/laporan/laporan-gudang";

interface OrderPerformanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JENIS_OPTIONS: { value: OrderPerformanceJenis; label: string }[] = [
  { value: "picker", label: "Picker" },
  { value: "packer", label: "Packer" },
  { value: "shipper", label: "Shipper" },
  { value: "pesanan", label: "Pesanan" },
  { value: "kurir", label: "Kurir" },
];

const MODE_OPTIONS: { value: OrderPerformanceMode; label: string }[] = [
  { value: "detail", label: "Detail" },
  { value: "summary", label: "Summary" },
];

const JENIS_TANPA_SUMMARY: OrderPerformanceJenis[] = ["pesanan"];

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

export function OrderPerformanceDialog({
  open,
  onOpenChange,
}: OrderPerformanceDialogProps) {
  const [jenis, setJenis] = React.useState<OrderPerformanceJenis | "">("");
  const [mode, setMode] = React.useState<OrderPerformanceMode>("detail");
  const [format, setFormat] = React.useState<ReportFormat>("pdf");
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    startOfMonth(),
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());
  const [locationIds, setLocationIds] = React.useState<string[]>([]);
  const exportXlsx = useExportOrderPerformance();

  const summaryDisabled = jenis !== "" && JENIS_TANPA_SUMMARY.includes(jenis);

  const effectiveMode: OrderPerformanceMode = summaryDisabled ? "detail" : mode;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setJenis("");
      setMode("detail");
      setFormat("pdf");
      setStartDate(startOfMonth());
      setEndDate(new Date());
      setLocationIds([]);
    }
    onOpenChange(next);
  }

  const invalidRange = Boolean(
    startDate && endDate && endDate.getTime() < startDate.getTime(),
  );
  const canCetak =
    Boolean(jenis && startDate && endDate) &&
    !invalidRange &&
    !exportXlsx.isPending;

  function handleCetak() {
    if (!jenis || !startDate || !endDate || invalidRange) return;

    const from = formatDateISO(startDate);
    const to = formatDateISO(endDate);
    const location_ids = locationIds.length ? locationIds : undefined;

    exportXlsx.mutate(
      { jenis, mode: effectiveMode, from, to, location_ids, format },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Performa Proses Pesanan</DialogTitle>
          <DialogDescription>
            Performa picker, packer, shipper, dan kurir, atau rincian durasi
            tiap tahapan pesanan.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              Jenis Laporan
            </Label>
            <Combobox
              options={JENIS_OPTIONS}
              value={jenis}
              onChange={(v) =>
                setJenis((v ?? "") as OrderPerformanceJenis | "")
              }
              placeholder="Pilih jenis laporan…"
              searchPlaceholder="Cari jenis…"
              emptyText="Jenis tidak ditemukan."
            />
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
              Lokasi (opsional)
            </Label>
            <LocationMultiCombobox
              value={locationIds}
              onChange={setLocationIds}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Mode</Label>
            <RadioGroup
              value={effectiveMode}
              onValueChange={(v) => setMode(v as OrderPerformanceMode)}
              className="grid grid-cols-2 gap-2"
            >
              {MODE_OPTIONS.map((o) => {
                const disabled = o.value === "summary" && summaryDisabled;

                return (
                  <label
                    key={o.value}
                    className={cn(
                      "flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm transition-colors",
                      disabled
                        ? "cursor-not-allowed border-border opacity-50"
                        : "cursor-pointer",
                      !disabled && effectiveMode === o.value
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-border",
                      !disabled &&
                        effectiveMode !== o.value &&
                        "hover:bg-muted/50",
                    )}
                  >
                    <RadioGroupItem value={o.value} disabled={disabled} />
                    {o.label}
                  </label>
                );
              })}
            </RadioGroup>
            {summaryDisabled && (
              <p className="text-xs text-muted-foreground">
                Laporan Pesanan hanya tersedia dalam mode Detail.
              </p>
            )}
          </div>

          <ReportFormatRadio value={format} onChange={setFormat} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleCetak} disabled={!canCetak}>
            {exportXlsx.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : format === "excel" ? (
              <DownloadIcon className="size-4" />
            ) : (
              <PrinterIcon className="size-4" />
            )}
            {format === "excel" ? "Unduh Excel" : "Cetak"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
