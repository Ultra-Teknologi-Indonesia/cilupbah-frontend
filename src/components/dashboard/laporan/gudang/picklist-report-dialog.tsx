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
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ReportFormatRadio,
  type ReportFormat,
} from "@/components/dashboard/laporan/shared/report-format-radio";
import {
  useExportPicklistDetail,
  useExportPicklistDetailPdf,
  useExportPicklistReport,
  usePicklistSearch,
} from "@/hooks/laporan/use-laporan-gudang";
import type { PicklistReportMode } from "@/types/laporan/laporan-gudang";

interface PicklistReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODE_OPTIONS: { value: PicklistReportMode; label: string }[] = [
  { value: "tanggal", label: "Tanggal Picklist" },
  { value: "no_picklist", label: "No Picklist" },
];

const DEBOUNCE_MS = 300;

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

export function PicklistReportDialog({
  open,
  onOpenChange,
}: PicklistReportDialogProps) {
  const [mode, setMode] = React.useState<PicklistReportMode>("tanggal");
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    startOfMonth(),
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());
  const [picklistId, setPicklistId] = React.useState("");
  const [orderIds, setOrderIds] = React.useState<string[]>([]);
  const [rawQuery, setRawQuery] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [format, setFormat] = React.useState<ReportFormat>("pdf");

  const exportPicklist = useExportPicklistReport();
  const exportDetail = useExportPicklistDetail();
  const exportDetailPdf = useExportPicklistDetailPdf();

  React.useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const { data: picklists, isFetching } = usePicklistSearch(
    query,
    open && mode === "no_picklist",
  );

  const picklistOptions = React.useMemo(
    () => (picklists ?? []).map((p) => ({ value: p.value, label: p.label })),
    [picklists],
  );

  const selected = React.useMemo(
    () => (picklists ?? []).find((p) => p.value === picklistId),
    [picklists, picklistId],
  );

  function resetState() {
    setMode("tanggal");
    setStartDate(startOfMonth());
    setEndDate(new Date());
    setPicklistId("");
    setOrderIds([]);
    setRawQuery("");
    setQuery("");
    setFormat("pdf");
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState();
    onOpenChange(next);
  }

  function handlePicklistChange(next: string | null) {
    setPicklistId(next ?? "");
    setOrderIds([]);
  }

  const invalidRange = Boolean(
    startDate && endDate && endDate.getTime() < startDate.getTime(),
  );

  const canCetak =
    mode === "tanggal"
      ? Boolean(startDate && endDate) &&
        !invalidRange &&
        !exportPicklist.isPending
      : Boolean(picklistId) && !exportDetail.isPending && !exportDetailPdf.isPending;

  const isExcelOutput = mode === "tanggal" || format === "excel";
  const busy = exportPicklist.isPending || exportDetail.isPending || exportDetailPdf.isPending;

  async function handleCetak() {
    if (mode === "tanggal") {
      if (!startDate || !endDate || invalidRange) return;
      try {
        await exportPicklist.mutateAsync({
          from: formatDateISO(startDate),
          to: formatDateISO(endDate),
        });
        toast.success("Berhasil mengunduh daftar picklist");
        handleOpenChange(false);
      } catch (error) {
        apiError(error, "Gagal mengunduh daftar picklist");
      }
      return;
    }

    if (!picklistId) return;

    if (format === "excel") {
      try {
        await exportDetail.mutateAsync({
          picklist_id: picklistId,
          order_ids: orderIds.length ? orderIds : undefined,
        });
        toast.success("Berhasil mengunduh detail picklist");
        handleOpenChange(false);
      } catch (error) {
        apiError(error, "Gagal mengunduh detail picklist");
      }
      return;
    }

    try {
      await exportDetailPdf.mutateAsync({
        picklist_id: picklistId,
        order_ids: orderIds.length ? orderIds : undefined,
      });
      toast.success("Berhasil mengunduh detail picklist");
      handleOpenChange(false);
    } catch (error) {
      apiError(error, "Gagal mengunduh detail picklist");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Daftar Picklist</DialogTitle>
          <DialogDescription>
            Cetak rekap picklist per rentang tanggal, atau detail satu picklist
            berikut foto dan rak.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              Cetak Berdasarkan
            </Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as PicklistReportMode)}
              className="grid grid-cols-2 gap-2"
            >
              {MODE_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm transition-colors",
                    mode === o.value
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

          {mode === "tanggal" ? (
            <>
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
              <p className="text-xs text-muted-foreground">
                Picking selalu dari Gudang Kecil, jadi tidak ada pilihan lokasi.
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">
                  Picklist
                </Label>
                <Combobox
                  options={picklistOptions}
                  value={picklistId}
                  onChange={handlePicklistChange}
                  onQueryChange={setRawQuery}
                  loading={isFetching}
                  placeholder="Pilih picklist…"
                  searchPlaceholder="Cari no. picklist…"
                  emptyText="Picklist tidak ditemukan."
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">
                  No Pesanan (opsional)
                </Label>
                <Combobox
                  multiple
                  wrap
                  options={selected?.orders ?? []}
                  value={orderIds}
                  onChange={setOrderIds}
                  disabled={!picklistId}
                  placeholder={
                    picklistId ? "Semua pesanan" : "Pilih picklist dulu"
                  }
                  searchPlaceholder="Cari no. pesanan…"
                  emptyText="Tidak ada pesanan."
                />
              </div>

              <ReportFormatRadio value={format} onChange={setFormat} />
              {format === "excel" && (
                <p className="text-xs text-muted-foreground">
                  Excel menyertakan foto produk tiap baris.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleCetak} disabled={!canCetak}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isExcelOutput ? (
              <DownloadIcon className="size-4" />
            ) : (
              <PrinterIcon className="size-4" />
            )}
            {isExcelOutput ? "Unduh Excel" : "Cetak"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
