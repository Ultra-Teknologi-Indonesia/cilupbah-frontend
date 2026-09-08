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
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { LocationCombobox } from "@/components/dashboard/laporan/shared/location-combobox";
import {
  ReportFormatRadio,
  type ReportFormat,
} from "@/components/dashboard/laporan/shared/report-format-radio";
import {
  useExportPutawayList,
  usePutawayNumbers,
} from "@/hooks/laporan/use-laporan-gudang";

interface PutawayListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PutawayListDialog({
  open,
  onOpenChange,
}: PutawayListDialogProps) {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [locationId, setLocationId] = React.useState("");
  const [putawayIds, setPutawayIds] = React.useState<string[]>([]);
  const [format, setFormat] = React.useState<ReportFormat>("pdf");
  const exportXlsx = useExportPutawayList();

  const dateISO = date ? formatDateISO(date) : "";

  const { data: putawayOptions, isFetching } = usePutawayNumbers(
    dateISO,
    locationId,
    open,
  );

  function handleDateChange(next: Date | undefined) {
    setDate(next);
    setPutawayIds([]);
  }

  function handleLocationChange(next: string) {
    setLocationId(next);
    setPutawayIds([]);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setDate(new Date());
      setLocationId("");
      setPutawayIds([]);
      setFormat("pdf");
    }
    onOpenChange(next);
  }

  const canCetak = Boolean(date && locationId) && !exportXlsx.isPending;

  function handleCetak() {
    if (!date || !locationId) return;

    exportXlsx.mutate(
      {
        date: dateISO,
        location_id: locationId,
        putaway_ids: putawayIds.length ? putawayIds : undefined,
        format,
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Penempatan Barang</DialogTitle>
          <DialogDescription>
            Rincian isi penempatan pada satu tanggal dan lokasi, berikut sumber
            penerimaan dan rak tujuannya.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Tanggal</Label>
            <DatePicker
              value={date}
              onChange={handleDateChange}
              placeholder="Pilih tanggal"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Lokasi</Label>
            <LocationCombobox
              value={locationId}
              onChange={handleLocationChange}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              No. Penempatan (opsional)
            </Label>
            <Combobox
              multiple
              wrap
              options={putawayOptions ?? []}
              value={putawayIds}
              onChange={setPutawayIds}
              loading={isFetching}
              disabled={!locationId}
              placeholder={
                locationId ? "Semua penempatan" : "Pilih lokasi dulu"
              }
              searchPlaceholder="Cari no. penempatan…"
              emptyText="Tidak ada penempatan pada tanggal ini."
            />
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
