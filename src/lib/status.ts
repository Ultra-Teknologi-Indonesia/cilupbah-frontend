export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "muted"
  | "info"
  | "indigo"
  | "purple"
  | "orange"
  | "teal";

export interface StatusMeta {
  label: string;
  variant: BadgeVariant;
}

export type Domain =
  | "sales-return"
  | "sales-return-reason-category"
  | "sales-return-marketplace-decision"
  | "inventory-transfer"
  | "bin-transfer"
  | "stock-adjustment"
  | "stock-opname"
  | "stock-revaluation"
  | "stock-reserve"
  | "return-settlement"
  | "picklist"
  | "packlist"
  | "shipment"
  | "purchase-order"
  | "sales-order"
  | "inbound"
  | "inbound-participant"
  | "putaway"
  | "channel-integration"
  | "channel-listing-sync"
  | "order-download"
  | "picking-item"
  | "product-boost"
  | "product-boost-activity"
  | "order-payment"
  | "download-task"
  | "stock-replenishment"
  | "impex-activity"
  | "bulk-label-item"
  | "order-origin"
  | "channel-status";

export const STATUS_REGISTRY: Record<Domain, Record<string, StatusMeta>> = {
  "channel-status": {
    UNPAID: { label: "Belum Dibayar", variant: "warning" },
    ON_HOLD: { label: "Belum Dibayar", variant: "warning" },
    READY_TO_SHIP: { label: "Perlu Dikirim", variant: "info" },
    AWAITING_SHIPMENT: { label: "Perlu Dikirim", variant: "info" },
    PROCESSED: { label: "Menunggu Pickup Kurir", variant: "purple" },
    AWAITING_COLLECTION: { label: "Menunggu Pickup Kurir", variant: "purple" },
    SHIPPED: { label: "Sedang Dikirim", variant: "indigo" },
    IN_TRANSIT: { label: "Sedang Dikirim", variant: "indigo" },
    TO_CONFIRM_RECEIVE: { label: "Sampai / Konfirmasi", variant: "teal" },
    DELIVERED: { label: "Sampai / Konfirmasi", variant: "teal" },
    COMPLETED: { label: "Selesai", variant: "success" },
    CANCELLED: { label: "Dibatalkan", variant: "destructive" },
    CANCELED: { label: "Dibatalkan", variant: "destructive" },
    IN_CANCEL: { label: "Pengajuan Batal", variant: "orange" },
    RETURN_REQUESTED: { label: "Pengajuan Retur", variant: "orange" },
    TO_RETURN: { label: "Pengajuan Retur", variant: "orange" },
    RETURNED: { label: "Diretur", variant: "muted" },
  },
  "sales-return": {
    PENDING: { label: "Menunggu", variant: "warning" },
    ACCEPTED: { label: "Disetujui", variant: "info" },
    REJECTED: { label: "Ditolak", variant: "destructive" },
    COMPLETED: { label: "Selesai", variant: "success" },
    CANCELLED: { label: "Dibatalkan", variant: "muted" },
  },

  "sales-return-reason-category": {
    FAILED_DELIVERY: { label: "Gagal Kirim", variant: "warning" },
    COMPLAINT: { label: "Komplain Pembeli", variant: "info" },
    CANCEL_SHIPPED: { label: "Cancel Telanjur Kirim", variant: "indigo" },
    REMORSE: { label: "Berubah Pikiran", variant: "purple" },
    OTHER: { label: "Lainnya", variant: "muted" },
  },

  "sales-return-marketplace-decision": {
    MP_PENDING: { label: "Menunggu Keputusan", variant: "warning" },
    MP_APPROVED: { label: "Disetujui Marketplace", variant: "info" },
    MP_REJECTED: { label: "Ditolak Marketplace", variant: "destructive" },
    MP_DISPUTE: { label: "Dalam Banding", variant: "orange" },
    MP_JUDGING: { label: "Diarbitrase Marketplace", variant: "indigo" },
    MP_REFUNDED: { label: "Dana Dikembalikan", variant: "success" },
    MP_CLOSED: { label: "Ditutup", variant: "muted" },
    MP_NOT_RETURN: { label: "Bukan Retur", variant: "muted" },
  },

  "inventory-transfer": {
    DRAFT: { label: "Draft", variant: "muted" },
    APPROVED: { label: "Disetujui", variant: "indigo" },
    IN_TRANSIT: { label: "Dikirim", variant: "info" },
    RECEIVED: { label: "Diterima", variant: "success" },
    CANCELLED: { label: "Dibatalkan", variant: "destructive" },
  },

  "inbound-participant": {
    ACTIVE: { label: "Sedang input", variant: "info" },
    DONE: { label: "Selesai", variant: "success" },
    WITHDRAWN: { label: "Ditarik", variant: "muted" },
  },

  "bin-transfer": {
    BARU_DIBUAT: { label: "Baru Dibuat", variant: "muted" },
    SEDANG_DIJALAN: { label: "Sedang Dijalan", variant: "info" },
    SELESAI: { label: "Selesai", variant: "success" },
  },

  "stock-adjustment": {
    DRAFT: { label: "Draft", variant: "muted" },
    APPROVED: { label: "Disetujui", variant: "success" },
    CANCELLED: { label: "Dibatalkan", variant: "destructive" },
  },

  "stock-opname": {
    DRAFT: { label: "Draft", variant: "muted" },
    IN_PROGRESS: { label: "Proses", variant: "info" },
    FINALIZED: { label: "Selesai", variant: "success" },
    CANCELLED: { label: "Dibatalkan", variant: "destructive" },
  },

  "stock-revaluation": {
    APPROVED: { label: "Disetujui", variant: "success" },
    CANCELLED: { label: "Dibatalkan", variant: "destructive" },
  },

  "stock-reserve": {
    ACTIVE: { label: "Aktif", variant: "success" },
    CANCELLED: { label: "Dibatalkan", variant: "destructive" },
  },

  "return-settlement": {
    DRAFT: { label: "Draft", variant: "muted" },
    CONFIRMED: { label: "Dikonfirmasi", variant: "info" },
    COMPLETED: { label: "Selesai", variant: "success" },
  },

  picklist: {
    DRAFT: { label: "Draft", variant: "muted" },
    IN_PROGRESS: { label: "Diproses", variant: "info" },
    COMPLETED: { label: "Selesai", variant: "success" },
    FAILED: { label: "Gagal", variant: "destructive" },
    CANCELLED: { label: "Dibatalkan", variant: "muted" },
  },

  packlist: {
    DRAFT: { label: "Draft", variant: "muted" },
    IN_PROGRESS: { label: "Diproses", variant: "info" },
    COMPLETED: { label: "Selesai", variant: "success" },
    CANCELLED: { label: "Dibatalkan", variant: "muted" },
  },

  shipment: {
    SCHEDULED: { label: "Terjadwal", variant: "info" },
    HANDED_OVER: { label: "Diserahkan", variant: "warning" },
    IN_TRANSIT: { label: "Dikirim", variant: "indigo" },
    DELIVERED: { label: "Terkirim", variant: "success" },
    CANCELLED: { label: "Dibatalkan", variant: "muted" },
  },

  "purchase-order": {
    DRAFT: { label: "Draft", variant: "muted" },
    OPEN: { label: "Belum Diterima", variant: "warning" },
    PARTIAL_RECEIVED: { label: "Diterima Sebagian", variant: "info" },
    CLOSED: { label: "Ditutup", variant: "muted" },
    FULLY_RECEIVED: { label: "Selesai", variant: "success" },
  },

  "sales-order": {
    pending: { label: "Menunggu", variant: "orange" },
    unpaid: { label: "Belum Bayar", variant: "orange" },
    reserved: { label: "Siap Proses", variant: "info" },
    "ready-to-process": {
      label: "Siap Proses",
      variant: "info",
    },
    "ready-to-pick": { label: "Pengambilan - Siap Diambil", variant: "indigo" },
    "on-picking": { label: "Pengambilan - Sedang Diproses", variant: "indigo" },
    "picking-diproses": {
      label: "Pengambilan - Sedang Diproses",
      variant: "indigo",
    },
    picked: { label: "Pengambilan - Selesai", variant: "teal" },
    "finish-pick": { label: "Pengambilan - Selesai", variant: "teal" },
    "on-packing": { label: "Pengepakan - Sedang Diproses", variant: "purple" },
    "packing-diproses": {
      label: "Pengepakan - Sedang Diproses",
      variant: "purple",
    },
    packed: { label: "Pengepakan - Selesai", variant: "purple" },
    "finish-pack": { label: "Pengepakan - Selesai", variant: "purple" },
    "ready-to-ship": { label: "Pengiriman - Siap Dikirim", variant: "indigo" },
    shipped: { label: "Pengiriman - Sedang Dikirim", variant: "success" },
    "in-transit": { label: "Pengiriman - Sedang Dikirim", variant: "success" },
    completed: { label: "Selesai", variant: "success" },
    delivered: { label: "Selesai", variant: "success" },
    cancelled: { label: "Dibatalkan", variant: "destructive" },
    "empty-stock": { label: "Stok Kosong", variant: "destructive" },
    "failed-pick": { label: "Gagal Pengambilan", variant: "destructive" },
  },

  inbound: {
    DRAFT: { label: "Belum Mulai", variant: "muted" },
    PARTIAL: { label: "Sebagian", variant: "warning" },
    RECEIVED: { label: "Selesai Diterima", variant: "info" },
    PUTAWAY_IN_PROGRESS: { label: "Sedang Putaway", variant: "indigo" },
    COMPLETED: { label: "Selesai", variant: "success" },
    CANCELLED: { label: "Dibatalkan", variant: "destructive" },
  },

  putaway: {
    NOT_STARTED: { label: "Belum Mulai", variant: "muted" },
    IN_PROGRESS: { label: "Sedang Diproses", variant: "warning" },
    COMPLETED: { label: "Selesai", variant: "success" },
    CANCELLED: { label: "Dibatalkan", variant: "destructive" },
  },

  "channel-integration": {
    normal: { label: "Normal", variant: "success" },
    warning: { label: "Perlu Perhatian", variant: "warning" },
    error: { label: "Integrasi Bermasalah", variant: "destructive" },
  },

  "channel-listing-sync": {
    synced: { label: "Tersinkron", variant: "success" },
    in_review: { label: "Direview", variant: "warning" },
    pending: { label: "Menunggu", variant: "warning" },
    syncing: { label: "Sinkron", variant: "warning" },
    rejected: { label: "Ditolak", variant: "destructive" },
    failed: { label: "Gagal", variant: "destructive" },
    deactivated: { label: "Nonaktif", variant: "muted" },
  },

  "order-download": {
    normal: { label: "Normal", variant: "success" },
    pending: { label: "Tertunda", variant: "warning" },
    problem: { label: "Bermasalah", variant: "destructive" },
    nonaktif: { label: "Nonaktif", variant: "muted" },
  },

  "picking-item": {
    COMPLETED: { label: "Selesai", variant: "success" },
    PARTIAL: { label: "Sebagian", variant: "warning" },
    PENDING: { label: "Belum", variant: "muted" },
    SHORT: { label: "Kurang", variant: "warning" },
    REJECTED: { label: "Ditolak", variant: "destructive" },
    PROCESSED_EXTERNALLY: { label: "Diproses channel", variant: "info" },
  },

  "product-boost": {
    ACTIVE: { label: "Aktif", variant: "success" },
    INACTIVE: { label: "Tidak Aktif", variant: "muted" },
  },

  "product-boost-activity": {
    SUCCESS: { label: "Sukses", variant: "success" },
    FAILED: { label: "Gagal", variant: "destructive" },
  },

  "order-payment": {
    PAID: { label: "Lunas", variant: "success" },
    UNPAID: { label: "Belum Dibayar", variant: "warning" },
  },

  "download-task": {
    queued: { label: "Menunggu", variant: "warning" },
    downloading: { label: "Sedang berjalan", variant: "info" },
    done: { label: "Selesai", variant: "success" },
    failed: { label: "Gagal", variant: "destructive" },
  },

  "stock-replenishment": {
    PENDING: { label: "Menunggu", variant: "warning" },
    ACCEPTED: { label: "Disetujui", variant: "info" },
    REJECTED: { label: "Ditolak", variant: "destructive" },
    DONE: { label: "Selesai", variant: "success" },
    CANCELLED: { label: "Dibatalkan otomatis", variant: "muted" },
  },

  "impex-activity": {
    pending: { label: "Menunggu", variant: "warning" },
    processing: { label: "Sedang Proses", variant: "info" },
    success: { label: "Berhasil", variant: "success" },
    failed: { label: "Gagal", variant: "destructive" },
  },

  "bulk-label-item": {
    pending: { label: "Menunggu Label", variant: "muted" },
    downloading: { label: "Mengambil Label", variant: "info" },
    waiting_awb: { label: "Menunggu No. Resi", variant: "info" },
    waiting_shopee_prep: { label: "Menunggu Shopee", variant: "warning" },
    waiting_lazada_prep: { label: "Menunggu Lazada", variant: "warning" },
    done: { label: "Berhasil", variant: "success" },
    failed: { label: "Gagal", variant: "destructive" },
    skipped_instant: { label: "Instant courier", variant: "orange" },
  },

  "order-origin": {
    shadow: { label: "Shadow", variant: "muted" },
  },
};

const FALLBACK_VARIANT: BadgeVariant = "muted";

export function getStatusMeta(
  domain: Domain,
  status: string | null | undefined,
): StatusMeta {
  const raw = status ?? "";
  const meta =
    STATUS_REGISTRY[domain]?.[raw] ??
    STATUS_REGISTRY[domain]?.[raw.toUpperCase()];
  if (meta) return meta;
  return { label: raw || "—", variant: FALLBACK_VARIANT };
}
