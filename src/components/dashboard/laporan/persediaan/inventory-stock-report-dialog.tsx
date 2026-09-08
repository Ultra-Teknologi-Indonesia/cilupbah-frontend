"use client";

import * as React from "react";
import { DownloadIcon, Loader2Icon, PrinterIcon, WarehouseIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationCombobox } from "@/components/dashboard/laporan/shared/location-combobox";
import { LocationMultiCombobox } from "@/components/dashboard/laporan/shared/location-multi-combobox";
import { SkuMultiComboboxLazy } from "@/components/dashboard/laporan/shared/sku-multi-combobox-lazy";
import { ReportFormatRadio, type ReportFormat } from "@/components/dashboard/laporan/shared/report-format-radio";
import { useAsyncExport } from "@/hooks/laporan/use-async-export";
import { InventoryStockService } from "@/services/persediaan/inventory.service";

type StockReportType = "by_location" | "as_of_date";
type StockFilter = "all" | "positive" | "zero";

interface StockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const stockOptions: { value: StockFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "positive", label: "Qty On Hand lebih dari 0" },
  { value: "zero", label: "Qty On Hand habis" },
];

export function InventoryStockReportDialog({
  open,
  onOpenChange,
}: StockDialogProps) {
  const [reportType, setReportType] =
    React.useState<StockReportType>("by_location");
  const [asOfDate, setAsOfDate] = React.useState<Date | undefined>(new Date());
  const [itemIds, setItemIds] = React.useState<string[]>([]);
  const [locationIds, setLocationIds] = React.useState<string[]>([]);
  const [stockFilter, setStockFilter] = React.useState<StockFilter>("all");
  const [onlyNotRestocked, setOnlyNotRestocked] = React.useState(false);
  const [format, setFormat] = React.useState<ReportFormat>("excel");

  const exportXlsx = useAsyncExport((params: Parameters<typeof InventoryStockService.exportReport>[0]) =>
    InventoryStockService.exportReport(params),
  );

  function reset(): void {
    setReportType("by_location");
    setAsOfDate(new Date());
    setItemIds([]);
    setLocationIds([]);
    setStockFilter("all");
    setOnlyNotRestocked(false);
    setFormat("excel");
  }

  function handleOpenChange(next: boolean): void {
    if (!next && !exportXlsx.isPending) reset();
    onOpenChange(next);
  }

  const canExport = reportType === "by_location" || Boolean(asOfDate);

  function handleExport(): void {
    if (!canExport) return;

    exportXlsx.mutate(
      {
        report_type: reportType,
        item_ids: itemIds.length ? itemIds : undefined,
        location_ids: locationIds.length ? locationIds : undefined,
        as_of_date: reportType === "as_of_date" && asOfDate ? formatDateISO(asOfDate) : undefined,
        stock_filter: stockFilter,
        only_not_restocked: onlyNotRestocked,
        format,
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Persediaan Barang</DialogTitle>
          <DialogDescription>
            Buat laporan berdasarkan lokasi saat ini atau posisi stok sampai tanggal tertentu.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <ReportFormatRadio value={format} onChange={setFormat} />
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Cetak berdasarkan</Label>
            <RadioGroup
              value={reportType}
              onValueChange={(value) => setReportType(value as StockReportType)}
              className="grid gap-2 sm:grid-cols-2"
            >
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm hover:bg-muted/50">
                <RadioGroupItem value="by_location" />
                Persediaan Barang per Lokasi
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm hover:bg-muted/50">
                <RadioGroupItem value="as_of_date" />
                Persediaan Barang per Tanggal
              </label>
            </RadioGroup>
          </div>

          {reportType === "as_of_date" && (
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Sampai tanggal <span className="text-destructive">*</span></Label>
              <DatePicker value={asOfDate} onChange={setAsOfDate} placeholder="Pilih tanggal" />
              <p className="text-xs text-muted-foreground">Stok dihitung dari kronologi sampai akhir tanggal yang dipilih.</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">SKU / Produk</Label>
              <SkuMultiComboboxLazy value={itemIds} onChange={setItemIds} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Lokasi</Label>
              <LocationMultiCombobox value={locationIds} onChange={setLocationIds} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Filter stok</Label>
            <Select value={stockFilter} onValueChange={(value) => setStockFilter(value as StockFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stockOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed px-4 py-3 text-sm">
            <Checkbox checked={onlyNotRestocked} onCheckedChange={(checked) => setOnlyNotRestocked(checked === true)} />
            <span>
              <span className="block font-medium">Hanya tampilkan produk yang tidak perlu direstok</span>
              <span className="block text-xs text-muted-foreground">Mengikuti batas stok minimum pada SKU.</span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={exportXlsx.isPending}>Batal</Button>
          <Button variant="primary" onClick={handleExport} disabled={!canExport || exportXlsx.isPending}>
            {exportXlsx.isPending ? <Loader2Icon className="size-4 animate-spin" /> : format === "excel" ? <DownloadIcon className="size-4" /> : <PrinterIcon className="size-4" />}
            {exportXlsx.isPending ? "Menyiapkan..." : format === "excel" ? "Unduh Excel" : "Unduh PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryRackReportDialog({
  open,
  onOpenChange,
}: StockDialogProps) {
  const [locationId, setLocationId] = React.useState("");
  const [itemIds, setItemIds] = React.useState<string[]>([]);
  const [onlyWithStock, setOnlyWithStock] = React.useState(false);
  const [format, setFormat] = React.useState<ReportFormat>("excel");

  const exportXlsx = useAsyncExport((params: Parameters<typeof InventoryStockService.exportReport>[0]) =>
    InventoryStockService.exportReport(params),
  );

  function handleOpenChange(next: boolean): void {
    if (!next && !exportXlsx.isPending) {
      setLocationId("");
      setItemIds([]);
      setOnlyWithStock(false);
      setFormat("excel");
    }
    onOpenChange(next);
  }

  function handleExport(): void {
    if (!locationId) return;
    exportXlsx.mutate(
      {
        report_type: "by_rack",
        location_id: locationId,
        item_ids: itemIds.length ? itemIds : undefined,
        only_with_stock: onlyWithStock,
        format,
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><WarehouseIcon className="size-5" /></div>
            <div>
              <DialogTitle>Export Persediaan Per Rak</DialogTitle>
              <DialogDescription>Pilih satu gudang untuk melihat stok pada setiap rak.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <ReportFormatRadio value={format} onChange={setFormat} />
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Gudang <span className="text-destructive">*</span></Label>
            <LocationCombobox value={locationId} onChange={setLocationId} placeholder="Pilih gudang" />
            <p className="text-xs text-muted-foreground">Transit tidak dapat dipilih untuk laporan per rak.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">SKU / Produk</Label>
            <SkuMultiComboboxLazy value={itemIds} onChange={setItemIds} />
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-sm">
            <Checkbox checked={onlyWithStock} onCheckedChange={(checked) => setOnlyWithStock(checked === true)} />
            Tampilkan hanya rak yang memiliki stok
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={exportXlsx.isPending}>Batal</Button>
          <Button variant="primary" onClick={handleExport} disabled={!locationId || exportXlsx.isPending}>
            {exportXlsx.isPending ? <Loader2Icon className="size-4 animate-spin" /> : format === "excel" ? <DownloadIcon className="size-4" /> : <PrinterIcon className="size-4" />}
            {exportXlsx.isPending ? "Menyiapkan..." : format === "excel" ? "Unduh Excel" : "Unduh PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
