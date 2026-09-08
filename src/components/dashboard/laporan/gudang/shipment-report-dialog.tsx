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
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { ReportFormatRadio, type ReportFormat } from "@/components/dashboard/laporan/shared/report-format-radio";
import {
  useExportShipmentList,
  useShipmentFilterOptions,
} from "@/hooks/laporan/use-laporan-gudang";

interface ShipmentReportDialogProps {
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

export function ShipmentReportDialog({
  open,
  onOpenChange,
}: ShipmentReportDialogProps) {
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    startOfMonth(),
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());
  const [courierIds, setCourierIds] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<string>("");
  const [format, setFormat] = React.useState<ReportFormat>("excel");

  const { data: options, isFetching } = useShipmentFilterOptions(open);
  const exportShipment = useExportShipmentList();

  function handleOpenChange(next: boolean) {
    if (!next) {
      setStartDate(startOfMonth());
      setEndDate(new Date());
      setCourierIds([]);
      setStatus("");
      setFormat("excel");
    }
    onOpenChange(next);
  }

  const invalidRange = Boolean(
    startDate && endDate && endDate.getTime() < startDate.getTime(),
  );
  const canCetak =
    Boolean(startDate && endDate) && !invalidRange && !exportShipment.isPending;

  async function handleCetak() {
    if (!startDate || !endDate || invalidRange) return;
    try {
      await exportShipment.mutateAsync({
        from: formatDateISO(startDate),
        to: formatDateISO(endDate),
        courier_ids: courierIds.length ? courierIds : undefined,
        status_mp: status || undefined,
        format,
      });
      toast.success("Berhasil mengunduh daftar pengiriman");
      handleOpenChange(false);
    } catch (error) {
      apiError(error, "Gagal mengunduh daftar pengiriman");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Daftar Pengiriman</DialogTitle>
          <DialogDescription>
            Laporan manifest pengiriman berikut kurir, resi, dan status pesanan.
            Kurir dan status opsional — kosongkan untuk semua.
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
              Kurir (opsional)
            </Label>
            <Combobox
              multiple
              wrap
              options={options?.couriers ?? []}
              value={courierIds}
              onChange={setCourierIds}
              loading={isFetching}
              placeholder="Semua kurir"
              searchPlaceholder="Cari kurir…"
              emptyText="Kurir tidak ditemukan."
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              Status (opsional)
            </Label>
            <Combobox
              options={options?.statuses ?? []}
              value={status}
              onChange={(v) => setStatus(v ?? "")}
              loading={isFetching}
              placeholder="Semua status"
              searchPlaceholder="Cari status…"
              emptyText="Status tidak ditemukan."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleCetak} disabled={!canCetak}>
            {exportShipment.isPending ? (
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
