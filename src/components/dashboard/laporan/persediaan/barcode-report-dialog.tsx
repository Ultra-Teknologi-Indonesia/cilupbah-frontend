"use client";

import * as React from "react";
import { PrinterIcon } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductPickerCombobox } from "@/components/dashboard/laporan/shared/product-picker-combobox";
import {
  BARCODE_PAPER_DEFAULT,
  BARCODE_PAPER_OPTIONS,
  type BarcodeHarga,
  type BarcodeJenis,
  type BarcodePaper,
} from "@/types/laporan/barcode";

interface BarcodeReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HARGA_OPTIONS: { value: BarcodeHarga; label: string }[] = [
  { value: "tanpa_harga", label: "Tanpa Harga" },
  { value: "default", label: "Dengan Harga" },
  { value: "online", label: "Online (semua toko + harga)" },
];

const JENIS_OPTIONS: { value: BarcodeJenis; label: string }[] = [
  { value: "sku", label: "SKU" },
  { value: "sku_induk", label: "SKU Induk" },
];

export function BarcodeReportDialog({
  open,
  onOpenChange,
}: BarcodeReportDialogProps) {
  const [jenis, setJenis] = React.useState<BarcodeJenis>("sku");
  const [ids, setIds] = React.useState<string[]>([]);
  const [harga, setHarga] = React.useState<BarcodeHarga>("tanpa_harga");
  const [paper, setPaper] = React.useState<BarcodePaper>(BARCODE_PAPER_DEFAULT);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setJenis("sku");
      setIds([]);
      setHarga("tanpa_harga");
      setPaper(BARCODE_PAPER_DEFAULT);
    }
    onOpenChange(next);
  }

  function handleJenisChange(next: string) {
    setJenis(next as BarcodeJenis);
    setIds([]);
  }

  function handleCetak() {
    if (ids.length === 0) return;
    const params = new URLSearchParams({ jenis, harga, paper });
    window.open(
      `/dashboard/document-preview/laporan-barcode/${ids.join(",")}?${params.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cetak Barcode Barang</DialogTitle>
          <DialogDescription>
            Pilih SKU dan format label. Alokasi rak Gudang Kecil akan dicetak
            otomatis jika SKU sudah memiliki rak.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              Jenis Laporan
            </Label>
            <RadioGroup
              value={jenis}
              onValueChange={handleJenisChange}
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
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              {jenis === "sku" ? "SKU" : "SKU Induk"}
            </Label>
            <ProductPickerCombobox mode={jenis} value={ids} onChange={setIds} />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Harga</Label>
            <Select
              value={harga}
              onValueChange={(v) => setHarga(v as BarcodeHarga)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HARGA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              Ukuran Kertas
            </Label>
            <Select
              value={paper}
              onValueChange={(v) => setPaper(v as BarcodePaper)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BARCODE_PAPER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleCetak}
            disabled={ids.length === 0}
          >
            <PrinterIcon className="size-4" />
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
