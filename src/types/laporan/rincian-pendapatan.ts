export type RincianPendapatanMode = "rincian" | "per_barang";

export interface RincianPendapatanParams {
  jenis: RincianPendapatanMode;
  from: string;
  to: string;
  item_ids?: string[];
  format?: "excel" | "pdf";
}
