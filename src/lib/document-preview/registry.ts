import { fetchBlobRaw } from "@/lib/api-client";
import {
  BIN_QR_PAPER_DEFAULT,
  LocationService,
  type BinQrPaper,
} from "@/services/manajemen-rak/location.service";
import { OutboundService } from "@/services/proses-pesanan/outbound.service";
import { PutawayService } from "@/services/barang-masuk/putaway.service";
import { StockAdjustmentService } from "@/services/transaksi-stok/stock-adjustment.service";
import { InboundService } from "@/services/barang-masuk/inbound.service";
import { OutboundTransferService } from "@/services/barang-keluar/outbound-transfer.service";
import { PurchaseOrderService } from "@/services/transaksi-pembelian/purchase-order.service";
import { ReportService } from "@/services/laporan/report.service";
import { LaporanGudangService } from "@/services/laporan/laporan-gudang.service";
import { ExportJobService } from "@/services/laporan/export-job.service";
import type {
  OrderPerformanceJenis,
  OrderPerformanceMode,
} from "@/types/laporan/laporan-gudang";
import {
  BARCODE_PAPER_DEFAULT,
  type BarcodeHarga,
  type BarcodeJenis,
  type BarcodePaper,
} from "@/types/laporan/barcode";

function extractApiMessage(err: unknown): string | null {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg) return msg;
  }
  return null;
}

function base64ToBlob(base64: string, contentType = "application/pdf"): Blob {
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  return new Blob([byteArray], { type: contentType });
}

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseBulkDocumentIds(value: string): string[] {
  return decodePathSegment(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export interface DocumentMeta {
  [key: string]: unknown;
}

export interface DocumentFetchResult {
  blob: Blob;

  meta?: DocumentMeta;
}

export interface DocumentTypeConfig {
  title: string;

  subtitle: (id: string, meta?: DocumentMeta) => string;

  fetchPdf: (
    id: string,
    query?: URLSearchParams,
    onProgress?: (msg: string) => void,
  ) => Promise<DocumentFetchResult>;

  backUrl: (id: string) => string;
  filename: (id: string, meta?: DocumentMeta) => string;

  resetBeforeRetry?: (id: string) => Promise<void>;

  excel?: {
    fetch: (id: string, query?: URLSearchParams) => Promise<Blob>;
    filename: (id: string, meta?: DocumentMeta) => string;
  };
}

export type DocumentTypeKey =
  | "picklist"
  | "picklist-by-orders"
  | "shipping-label"
  | "bin-qr"
  | "putaway"
  | "putaway-bulk"
  | "putaway-bulk-export"
  | "stock-adjustment"
  | "stock-adjustment-bulk"
  | "stock-adjustment-bulk-export"
  | "invoice"
  | "invoice-bulk"
  | "invoice-bulk-export"
  | "order-breakdown"
  | "manifest"
  | "surat-jalan-bulk"
  | "surat-jalan-bulk-export"
  | "picklist-by-orders-export"
  | "inbound-barcodes"
  | "inbound-receipt"
  | "transfer-out"
  | "transfer-out-bulk"
  | "transfer-out-bulk-export"
  | "bin-transfer-out"
  | "purchase-order"
  | "laporan-barcode"
  | "laporan-penempatan-barang"
  | "laporan-pengiriman-ekspedisi"
  | "laporan-performa-penempatan"
  | "laporan-performa-pesanan"
  | "laporan-picklist"
  | "laporan-penyesuaian"
  | "monitor-stock-export";

const HARGA_LABEL: Record<BarcodeHarga, string> = {
  tanpa_harga: "Tanpa Harga",
  default: "Dengan Harga",
  online: "Online (per toko)",
};

export const DOCUMENT_TYPES: Record<DocumentTypeKey, DocumentTypeConfig> = {
  picklist: {
    title: "Dokumen Picklist",
    subtitle: (id, meta) =>
      (meta?.picklist_no as string | undefined) ?? `PICK-${id.slice(0, 8)}…`,
    fetchPdf: async (id, _query, onProgress) => {
      const blob = await OutboundService.picklistPdf(id, onProgress);
      return { blob };
    },
    backUrl: () => "/dashboard/proses-pesanan/picking",
    filename: (id, meta) =>
      `${(meta?.picklist_no as string | undefined) ?? `PICK-${id}`}.pdf`,
    excel: {
      fetch: (id) => OutboundService.picklistExcel(id),
      filename: (id, meta) =>
        `${(meta?.picklist_no as string | undefined) ?? `PICK-${id}`}.xlsx`,
    },
  },

  "picklist-by-orders": {
    title: "Picklist (Pesanan Terpilih)",
    subtitle: (id) => {
      const count = id.split(",").filter(Boolean).length;
      return `${count} pesanan`;
    },
    fetchPdf: async (id) => {
      const orderIds = id
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const blob = await OutboundService.picklistBulkPdf(orderIds);
      return { blob, meta: { count: orderIds.length } };
    },
    backUrl: () => "/dashboard/proses-pesanan/picking",
    filename: () => {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      return `Picklist-Bulk-${stamp}.pdf`;
    },
  },

  "picklist-by-orders-export": {
    title: "Picklist (Pesanan Terpilih)",
    subtitle: () => "Export sedang diproses",
    fetchPdf: async (id, _query, onProgress) => {
      const result = await ExportJobService.waitForBlob(
        id,
        "application/pdf",
        onProgress,
      );
      return { blob: result.blob, meta: { file_name: result.fileName } };
    },
    backUrl: () => "/dashboard/proses-pesanan/picking",
    filename: (_id, meta) =>
      (meta?.file_name as string | undefined) ?? "Picklist-Bulk.pdf",
  },

  "invoice-bulk": {
    title: "Faktur (Pesanan Terpilih)",
    subtitle: (id) => {
      const count = id.split(",").filter(Boolean).length;
      return `${count} faktur`;
    },
    fetchPdf: async (id) => {
      const orderIds = id
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const blob = await OutboundService.invoiceBulkPdf(orderIds);
      return { blob, meta: { count: orderIds.length } };
    },
    backUrl: () => "/dashboard/proses-pesanan/packing",
    filename: () => {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      return `Faktur-Bulk-${stamp}.pdf`;
    },
  },

  "invoice-bulk-export": {
    title: "Faktur (Pesanan Terpilih)",
    subtitle: () => "Export sedang diproses",
    fetchPdf: async (id, _query, onProgress) => {
      const result = await ExportJobService.waitForBlob(
        id,
        "application/pdf",
        onProgress,
      );
      return { blob: result.blob, meta: { file_name: result.fileName } };
    },
    backUrl: () => "/dashboard/proses-pesanan/packing",
    filename: (_id, meta) =>
      (meta?.file_name as string | undefined) ?? "Faktur-Bulk.pdf",
  },

  "shipping-label": {
    title: "Label Pengiriman",
    subtitle: (id) => `Order ${id.slice(0, 8)}…`,
    fetchPdf: async (id, query) => {
      const opts = {
        document_type: query?.get("document_type") ?? undefined,
        document_size: query?.get("document_size") ?? undefined,
      };
      let res: Awaited<ReturnType<typeof OutboundService.marketplaceLabel>>;
      try {
        res = await OutboundService.marketplaceLabel(id, opts);
      } catch (err: unknown) {
        const msg = extractApiMessage(err);
        throw new Error(msg ?? "Label tidak dapat dimuat dari marketplace.");
      }

      if (res.type === "url" && res.url) {
        const r = await fetch(
          `/api/proxy-download?url=${encodeURIComponent(res.url)}`,
        );
        if (!r.ok) throw new Error("Gagal mengunduh label dari marketplace");
        const blob = await r.blob();
        return { blob, meta: { source: res.source } };
      }
      if (res.type === "base64" && res.document_base64) {
        const blob = base64ToBlob(
          res.document_base64,
          res.content_type ?? "application/pdf",
        );
        return { blob, meta: { source: res.source } };
      }
      throw new Error("Format label tidak dikenali");
    },
    resetBeforeRetry: async (id) => {
      await OutboundService.retryMarketplaceLabel(id);
    },
    backUrl: () => "/dashboard/proses-pesanan/shipping",
    filename: (id) => `shipping-label-${id.slice(0, 8)}.pdf`,
  },

  "bin-qr": {
    title: "QR Rak",
    subtitle: (id, meta) => {
      const name = meta?.location_name as string | undefined;
      const count = meta?.bin_count as number | undefined;
      if (name) return count ? `${name} • ${count} rak` : name;
      return `Lokasi ${id.slice(0, 8)}…`;
    },
    fetchPdf: async (id, query, onProgress) => {
      const binIdsRaw = query?.get("bin_ids") ?? "";
      const binIds = binIdsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const paperRaw = query?.get("paper");
      const paper: BinQrPaper = isBinQrPaper(paperRaw)
        ? paperRaw
        : BIN_QR_PAPER_DEFAULT;

      const { job_id } = await LocationService.createBinQrJob(id, {
        binIds: binIds.length > 0 ? binIds : undefined,
        paper,
      });

      let blob: Blob | null = null;
      while (true) {
        const statusData = await LocationService.getBinQrJobStatus(job_id);

        if (statusData.status === "failed") {
          throw new Error(statusData.error_message || "Job gagal diproses.");
        }

        if (statusData.status === "ready") {
          blob = await LocationService.downloadBinQrJobPdf(job_id);
          break;
        }

        if (onProgress) {
          const p = statusData.progress;
          onProgress(`Memproses... ${p.percent}% (${p.processed}/${p.total})`);
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      return {
        blob,
        meta: {
          bin_count: binIds.length || undefined,
          paper,
        },
      };
    },
    backUrl: (id) => `/dashboard/lokasi/${id}/edit`,
    filename: (id, meta) => {
      const code =
        (meta?.location_code as string | undefined) ?? id.slice(0, 8);
      return `qr-rak-${code}.pdf`;
    },
  },

  putaway: {
    title: "Laporan Putaway",
    subtitle: (id, meta) =>
      (meta?.putaway_no as string | undefined) ?? `PUT-${id.slice(0, 8)}…`,
    fetchPdf: async (id) => {
      const blob = await PutawayService.pdf(id);
      return { blob };
    },
    backUrl: () => "/dashboard/barang-masuk/penempatan",
    filename: (id, meta) =>
      `${(meta?.putaway_no as string | undefined) ?? `PUTAWAY-${id}`}.pdf`,
  },

  "putaway-bulk": {
    title: "Laporan Putaway (Bulk)",
    subtitle: (id) => {
      const count = id.split(",").filter(Boolean).length;
      return `${count} dokumen`;
    },
    fetchPdf: async (id) => {
      const ids = id
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const blob = await PutawayService.bulkPdf(ids);
      return { blob, meta: { count: ids.length } };
    },
    backUrl: () => "/dashboard/barang-masuk/penempatan",
    filename: () => {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      return `Putaway-Bulk-${stamp}.pdf`;
    },
  },

  "putaway-bulk-export": {
    title: "Laporan Putaway (Bulk)",
    subtitle: () => "Export sedang diproses",
    fetchPdf: async (id, _query, onProgress) => {
      const result = await ExportJobService.waitForBlob(
        id,
        "application/pdf",
        onProgress,
      );
      return { blob: result.blob, meta: { file_name: result.fileName } };
    },
    backUrl: () => "/dashboard/barang-masuk/penempatan",
    filename: (_id, meta) =>
      (meta?.file_name as string | undefined) ?? "Putaway-Bulk.pdf",
  },

  "stock-adjustment": {
    title: "Laporan Penyesuaian",
    subtitle: (id, meta) =>
      (meta?.adjustment_no as string | undefined) ?? `ADJ-${id.slice(0, 8)}…`,
    fetchPdf: async (id) => {
      const blob = await StockAdjustmentService.pdf(id);
      return { blob };
    },
    backUrl: () => "/dashboard/transaksi-stok?tab=penyesuaian",
    filename: (id, meta) =>
      `Laporan-Penyesuaian-${
        (meta?.adjustment_no as string | undefined) ?? id
      }.pdf`,
  },

  "stock-adjustment-bulk": {
    title: "Laporan Penyesuaian (Bulk)",
    subtitle: (id) => {
      const count = id.split(",").filter(Boolean).length;
      return `${count} dokumen`;
    },
    fetchPdf: async (id) => {
      const ids = id
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const blob = await StockAdjustmentService.bulkPdf(ids);
      return { blob, meta: { count: ids.length } };
    },
    backUrl: () => "/dashboard/transaksi-stok?tab=penyesuaian",
    filename: () => {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      return `Laporan-Penyesuaian-Bulk-${stamp}.pdf`;
    },
  },

  "stock-adjustment-bulk-export": {
    title: "Laporan Penyesuaian (Bulk)",
    subtitle: () => "Export sedang diproses",
    fetchPdf: async (id, _query, onProgress) => {
      const result = await ExportJobService.waitForBlob(
        id,
        "application/pdf",
        onProgress,
      );
      return { blob: result.blob, meta: { file_name: result.fileName } };
    },
    backUrl: () => "/dashboard/transaksi-stok?tab=penyesuaian",
    filename: (_id, meta) =>
      (meta?.file_name as string | undefined) ?? "Laporan-Penyesuaian-Bulk.pdf",
  },

  invoice: {
    title: "Faktur",
    subtitle: (id) => `Order ${id.slice(0, 8)}…`,
    fetchPdf: async (id) => {
      const blob = await OutboundService.invoicePdf(id);
      return { blob };
    },
    backUrl: () => "/dashboard/pesanan",
    filename: (id) => `INV-${id.slice(0, 8)}.pdf`,
  },

  "order-breakdown": {
    title: "Rincian Pesanan",
    subtitle: (id) => `Order ${id.slice(0, 8)}…`,
    fetchPdf: async (id) => {
      const blob = await OutboundService.orderBreakdownPdf(id);
      return { blob };
    },
    backUrl: () => "/dashboard/pesanan",
    filename: (id) => `RINCIAN-${id.slice(0, 8)}.pdf`,
  },

  manifest: {
    title: "Manifest Pengiriman",
    subtitle: (id, meta) =>
      (meta?.shipment_no as string | undefined) ?? `SHP-${id.slice(0, 8)}…`,
    fetchPdf: async (id) => {
      const [blob, shipment] = await Promise.all([
        OutboundService.manifestPdf(id),
        OutboundService.shipmentDetail(id),
      ]);
      return { blob, meta: { shipment_no: shipment.shipmentNo } };
    },
    backUrl: () => "/dashboard/proses-pesanan/shipping",
    filename: (id, meta) =>
      `${(meta?.shipment_no as string | undefined) ?? `SHP-${id}`}-manifest.pdf`,
    excel: {
      fetch: (id) => OutboundService.manifestExcel(id),
      filename: (id, meta) =>
        `${(meta?.shipment_no as string | undefined) ?? `SHP-${id}`}-manifest.xlsx`,
    },
  },

  "surat-jalan-bulk": {
    title: "Surat Jalan (Pesanan Terpilih)",
    subtitle: (id) => {
      const count = id.split(",").filter(Boolean).length;
      return `${count} pesanan`;
    },
    fetchPdf: async (id) => {
      const orderIds = id
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const blob = await OutboundService.manifestBulkPdf(orderIds);
      return { blob, meta: { count: orderIds.length } };
    },
    backUrl: () => "/dashboard/proses-pesanan/shipping",
    filename: () => {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      return `Manifest-Bulk-${stamp}.pdf`;
    },
  },

  "surat-jalan-bulk-export": {
    title: "Surat Jalan (Pesanan Terpilih)",
    subtitle: () => "Export sedang diproses",
    fetchPdf: async (id, _query, onProgress) => {
      const result = await ExportJobService.waitForBlob(
        id,
        "application/pdf",
        onProgress,
      );
      return { blob: result.blob, meta: { file_name: result.fileName } };
    },
    backUrl: () => "/dashboard/proses-pesanan/shipping",
    filename: (_id, meta) =>
      (meta?.file_name as string | undefined) ?? "Manifest-Bulk.pdf",
  },

  "inbound-barcodes": {
    title: "Barcode Barang Masuk",
    subtitle: (id) => `Inbound ${id.slice(0, 8)}…`,
    fetchPdf: async (id) => {
      const blob = await InboundService.barcodesPdf(id);
      return { blob };
    },
    backUrl: () => "/dashboard/barang-masuk/penerimaan",
    filename: (id) => `barcodes-inbound-${id.slice(0, 8)}.pdf`,
  },

  "inbound-receipt": {
    title: "Penerimaan Barang",
    subtitle: (id) => `Inbound ${id.slice(0, 8)}…`,
    fetchPdf: async (id) => {
      const blob = await InboundService.pdf(id);
      return { blob };
    },
    backUrl: () => "/dashboard/barang-masuk/penerimaan",
    filename: (id) => `penerimaan-${id.slice(0, 8)}.pdf`,
  },

  "transfer-out": {
    title: "Transfer Keluar",
    subtitle: (id, meta) =>
      (meta?.transfer_number as string | undefined) ?? `TRF-${id.slice(0, 8)}…`,
    fetchPdf: async (id) => {
      const blob = await OutboundTransferService.pdf(id);
      return { blob };
    },
    backUrl: () => "/dashboard/barang-keluar?tab=transfer",
    filename: (id, meta) =>
      `${(meta?.transfer_number as string | undefined) ?? `TRF-${id}`}.pdf`,
  },

  "transfer-out-bulk": {
    title: "Transfer Keluar (Bulk)",
    subtitle: (id) => {
      const count = parseBulkDocumentIds(id).length;
      return `${count} dokumen`;
    },
    fetchPdf: async (id) => {
      const ids = parseBulkDocumentIds(id);
      const blob = await OutboundTransferService.bulkPdf(ids);
      return { blob, meta: { count: ids.length } };
    },
    backUrl: () => "/dashboard/barang-keluar?tab=transfer",
    filename: () => {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      return `Surat-Jalan-Bulk-${stamp}.pdf`;
    },
  },

  "transfer-out-bulk-export": {
    title: "Transfer Keluar (Bulk)",
    subtitle: () => "Export sedang diproses",
    fetchPdf: async (id, _query, onProgress) => {
      const result = await ExportJobService.waitForBlob(
        id,
        "application/pdf",
        onProgress,
      );
      return { blob: result.blob, meta: { file_name: result.fileName } };
    },
    backUrl: () => "/dashboard/barang-keluar?tab=transfer",
    filename: (_id, meta) => {
      if (typeof meta?.file_name === "string" && meta.file_name) {
        return meta.file_name;
      }
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      return `Surat-Jalan-Bulk-${stamp}.pdf`;
    },
  },

  "bin-transfer-out": {
    title: "Surat Jalan Transfer Internal",
    subtitle: (id, meta) =>
      (meta?.transfer_number as string | undefined) ??
      `TRFO-${id.slice(0, 8)}…`,
    fetchPdf: async (id) => {
      const blob = await fetchBlobRaw(
        `/inventory/bin-transfers/${encodeURIComponent(id)}/pdf`,
        "application/pdf",
      );
      return { blob };
    },
    backUrl: () => "/dashboard/transaksi-stok?tab=transfer",
    filename: (id, meta) =>
      `${(meta?.transfer_number as string | undefined) ?? `TRFO-${id}`}.pdf`,
  },

  "purchase-order": {
    title: "Barang Masuk Pembelian",
    subtitle: (id, meta) =>
      (meta?.po_number as string | undefined) ?? `PO-${id.slice(0, 8)}…`,
    fetchPdf: async (id) => {
      const blob = await PurchaseOrderService.pdf(id);
      return { blob };
    },
    backUrl: () => "/dashboard/barang-masuk/penerimaan?tab=pesanan",
    filename: (id, meta) =>
      `${(meta?.po_number as string | undefined) ?? `PO-${id}`}.pdf`,
  },

  "laporan-barcode": {
    title: "Barcode Barang",
    subtitle: (id, meta) => {
      const count = decodeURIComponent(id).split(",").filter(Boolean).length;
      const harga = meta?.harga as string | undefined;
      const jenis = meta?.jenis === "sku_induk" ? "SKU Induk" : "SKU";
      return harga ? `${count} ${jenis} · ${harga}` : `${count} ${jenis}`;
    },
    fetchPdf: async (id, query) => {
      const ids = decodeURIComponent(id)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const jenis = (query?.get("jenis") ?? "sku") as BarcodeJenis;
      const harga = (query?.get("harga") ?? "tanpa_harga") as BarcodeHarga;
      const paperRaw = query?.get("paper");
      const paper: BarcodePaper = isBarcodePaper(paperRaw)
        ? paperRaw
        : BARCODE_PAPER_DEFAULT;
      const blob = await ReportService.barcodePdf({
        jenis,
        ids,
        harga,
        paper,
      });
      return { blob, meta: { harga: HARGA_LABEL[harga], jenis } };
    },
    backUrl: () => "/dashboard/laporan/persediaan",
    filename: () => {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      return `Barcode-Barang-${stamp}.pdf`;
    },
  },

  "laporan-penempatan-barang": {
    title: "Penempatan Barang",
    subtitle: (id) => `Tanggal ${decodeURIComponent(id)}`,
    fetchPdf: async (id, query) => {
      const putawayRaw = query?.get("putaway_ids") ?? "";
      const putaway_ids = putawayRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const blob = await LaporanGudangService.putawayListPdf({
        date: decodeURIComponent(id),
        location_id: query?.get("location_id") ?? "",
        putaway_ids: putaway_ids.length ? putaway_ids : undefined,
      });
      return { blob };
    },
    backUrl: () => "/dashboard/laporan/gudang",
    filename: (id) => `Daftar-Penempatan-Barang-${decodeURIComponent(id)}.pdf`,
  },

  "laporan-pengiriman-ekspedisi": {
    title: "Pengiriman per Ekspedisi",
    subtitle: (id) => {
      const [mode, from, to] = decodeURIComponent(id).split("_");
      const modeLabel = mode === "summary" ? "Summary" : "Detail";
      return `${modeLabel} · ${from} — ${to}`;
    },
    fetchPdf: async (id, query) => {
      const [mode, from, to] = decodeURIComponent(id).split("_");
      const locationRaw = query?.get("location_ids") ?? "";
      const location_ids = locationRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const blob = await LaporanGudangService.shipmentByCourierPdf({
        mode: mode as OrderPerformanceMode,
        from,
        to,
        location_ids: location_ids.length ? location_ids : undefined,
      });
      return { blob };
    },
    backUrl: () => "/dashboard/laporan/gudang",
    filename: (id) => {
      const [mode, from, to] = decodeURIComponent(id).split("_");
      return `Laporan-Pengiriman-Ekspedisi-${mode}-${from}-${to}.pdf`;
    },
  },

  "laporan-performa-penempatan": {
    title: "Performa Proses Penempatan",
    subtitle: (id) => {
      const [mode, from, to] = decodeURIComponent(id).split("_");
      const modeLabel = mode === "summary" ? "Summary" : "Detail";
      return `${modeLabel} · ${from} — ${to}`;
    },
    fetchPdf: async (id, query) => {
      const [mode, from, to] = decodeURIComponent(id).split("_");
      const locationRaw = query?.get("location_ids") ?? "";
      const location_ids = locationRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const blob = await LaporanGudangService.putawayPerformancePdf({
        mode: mode as OrderPerformanceMode,
        from,
        to,
        location_ids: location_ids.length ? location_ids : undefined,
      });
      return { blob };
    },
    backUrl: () => "/dashboard/laporan/gudang",
    filename: (id) => {
      const [mode, from, to] = decodeURIComponent(id).split("_");
      return `Laporan-Performa-Penempatan-${mode}-${from}-${to}.pdf`;
    },
  },

  "laporan-performa-pesanan": {
    title: "Performa Proses Pesanan",
    subtitle: (id) => {
      const [jenis, mode, from, to] = decodeURIComponent(id).split("_");
      const label = jenis ? jenis[0].toUpperCase() + jenis.slice(1) : "Laporan";
      const modeLabel = mode === "summary" ? "Summary" : "Detail";
      return `${label} · ${modeLabel} · ${from} — ${to}`;
    },
    fetchPdf: async (id, query) => {
      const [jenis, mode, from, to] = decodeURIComponent(id).split("_");
      const locationRaw = query?.get("location_ids") ?? "";
      const location_ids = locationRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const blob = await LaporanGudangService.orderPerformancePdf({
        jenis: jenis as OrderPerformanceJenis,
        mode: mode as OrderPerformanceMode,
        from,
        to,
        location_ids: location_ids.length ? location_ids : undefined,
      });
      return { blob };
    },
    backUrl: () => "/dashboard/laporan/gudang",
    filename: (id) => {
      const [jenis, mode, from, to] = decodeURIComponent(id).split("_");
      return `Laporan-Performa-${jenis}-${mode}-${from}-${to}.pdf`;
    },
  },

  "laporan-picklist": {
    title: "Detail Picklist",
    subtitle: (id, meta) =>
      (meta?.picklist_no as string | undefined) ??
      `Picklist ${decodeURIComponent(id).slice(0, 8)}`,
    fetchPdf: async (id, query) => {
      const orderRaw = query?.get("order_ids") ?? "";
      const order_ids = orderRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const blob = await LaporanGudangService.picklistDetailPdf({
        picklist_id: decodeURIComponent(id),
        order_ids: order_ids.length ? order_ids : undefined,
      });
      return { blob, meta: { picklist_no: query?.get("no") ?? undefined } };
    },
    backUrl: () => "/dashboard/laporan/gudang",
    filename: (id, meta) =>
      `Detail-Picklist-${(meta?.picklist_no as string | undefined) ?? decodeURIComponent(id).slice(0, 8)}.pdf`,
  },

  "laporan-penyesuaian": {
    title: "Daftar Penyesuaian Stok",
    subtitle: (id) => {
      const [start, end] = decodeURIComponent(id).split("_");
      return start && end ? `${start} — ${end}` : "Periode penyesuaian";
    },
    fetchPdf: async (id, query) => {
      const [start_date, end_date] = decodeURIComponent(id).split("_");
      const productRaw = query?.get("product_ids") ?? "";
      const locationRaw = query?.get("location_ids") ?? "";
      const product_ids = productRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const location_ids = locationRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const blob = await ReportService.penyesuaianStokPdf({
        start_date,
        end_date,
        product_ids: product_ids.length ? product_ids : undefined,
        location_ids: location_ids.length ? location_ids : undefined,
      });
      return { blob };
    },
    backUrl: () => "/dashboard/laporan/persediaan",
    filename: (id) => {
      const [start, end] = id.split("_");
      return `Daftar-Penyesuaian-${start}_${end}.pdf`;
    },
  },

  "monitor-stock-export": {
    title: "Export Monitor Stok",
    subtitle: (_id, meta) =>
      (meta?.file_name as string | undefined) ?? "Monitor Stok",
    fetchPdf: async (id, _query, onProgress) => {
      const wait = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      for (let attempt = 0; attempt < 240; attempt += 1) {
        const job = await ExportJobService.status(decodeURIComponent(id));
        if (job.status === "ready") {
          const blob = await ExportJobService.downloadBlob(
            decodeURIComponent(id),
            "application/pdf",
          );
          return { blob, meta: { file_name: job.file_name } };
        }
        if (job.status === "failed") {
          throw new Error(job.error ?? "Gagal membuat PDF Monitor Stok.");
        }
        onProgress?.("Menyiapkan PDF di server…");
        await wait(1500);
      }

      throw new Error("Pembuatan PDF terlalu lama. Silakan coba lagi.");
    },
    backUrl: () => "/dashboard/monitor-stok",
    filename: (_id, meta) =>
      (meta?.file_name as string | undefined) ?? "monitor-stok.pdf",
  },
};

function isBinQrPaper(value: string | null | undefined): value is BinQrPaper {
  return (
    value === "thermal_50x40" ||
    value === "thermal_80x40" ||
    value === "a4_single" ||
    value === "a4_multi"
  );
}

function isBarcodePaper(
  value: string | null | undefined,
): value is BarcodePaper {
  return (
    value === "thermal_50x50" ||
    value === "thermal_30x40" ||
    value === "thermal_50x40" ||
    value === "thermal_80x40" ||
    value === "thermal_40x30" ||
    value === "thermal_30x20" ||
    value === "a4_single" ||
    value === "a4_multi"
  );
}

export function isDocumentType(value: string): value is DocumentTypeKey {
  return value in DOCUMENT_TYPES;
}
