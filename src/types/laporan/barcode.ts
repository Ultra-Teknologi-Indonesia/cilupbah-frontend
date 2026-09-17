export type BarcodeJenis = "sku" | "sku_induk";
export type BarcodeHarga = "tanpa_harga" | "default" | "online";
export type BarcodePaper =
  | "thermal_50x50"
  | "thermal_30x40"
  | "thermal_50x40"
  | "thermal_80x40"
  | "thermal_40x30"
  | "thermal_30x20"
  | "a4_single"
  | "a4_multi";

export const BARCODE_PAPER_DEFAULT: BarcodePaper = "thermal_50x50";

export const BARCODE_PAPER_OPTIONS: { value: BarcodePaper; label: string }[] = [
  { value: "thermal_50x50", label: "Thermal 50x50mm (SKU + alokasi rak)" },
  {
    value: "thermal_30x40",
    label: "Thermal 30x40mm · layout mendatar (SKU + alokasi rak)",
  },
  { value: "thermal_50x40", label: "Thermal 50x40mm (SHELVING)" },
  { value: "thermal_80x40", label: "Thermal 80x40mm" },
  { value: "thermal_40x30", label: "Thermal 40x30mm" },
  { value: "thermal_30x20", label: "Thermal 30x20mm" },
  { value: "a4_single", label: "A4 (1 label per halaman)" },
  { value: "a4_multi", label: "A4 (8 label per halaman)" },
];

export interface BarcodeReportParams {
  jenis: BarcodeJenis;
  ids: string[];
  harga: BarcodeHarga;
  paper: BarcodePaper;
  download?: boolean;
}
