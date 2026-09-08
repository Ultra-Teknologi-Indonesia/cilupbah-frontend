export const RIWAYAT_FIELD_LABELS: Record<string, string> = {
  status: "Status",
  wms_status: "Status WMS",
  channel_status: "Status Channel",
  is_paid: "Sudah Dibayar",
  is_canceled: "Dibatalkan",
  is_label_printed: "Label Dicetak",
  is_escrow_updated: "Escrow Diperbarui",
  cancel_reason: "Alasan Batal",
  cancel_reason_detail: "Detail Alasan Batal",
  pick_fail_reason: "Alasan Gagal Picking",
  pick_failed_at: "Waktu Gagal Picking",
  tracking_number: "No. Resi",
  shipping_provider: "Ekspedisi",
  courier: "Kurir",
  shipping_address: "Alamat Kirim",
  shipping_full_name: "Nama Penerima",
  shipping_phone: "Telepon Penerima",
  shipping_city: "Kota",
  shipping_area: "Kecamatan",
  shipping_province: "Provinsi",
  shipping_post_code: "Kode Pos",
  customer_name: "Nama Pelanggan",
  payment_method: "Metode Pembayaran",
  payment_date: "Waktu Pembayaran",
  paid_time: "Waktu Pembayaran",
  mp_completed_date: "Diselesaikan Channel",
  mp_timestamp: "Waktu Marketplace",
  awb_printed_count: "Cetak Resi (jumlah)",
  label_printed_count: "Cetak Label (jumlah)",
  process_number: "No. Proses",
  picked_in: "Sesi Picking",
  location_id: "Lokasi",
  location_name: "Lokasi",
  zone_id: "Zona",
  zone_name: "Zona Rak",
  district_cd: "Kode Distrik",
  shipping_subdistrict: "Kecamatan Kirim",
  due_date: "Batas Kirim",
  return_zone_id: "Zona Retur",
  dispute_outcome: "Keputusan Retur",
  completed_date: "Waktu Selesai",
  driver_name: "Nama Driver",
  driver_phone: "Telepon Driver",
};

export const RIWAYAT_ACTION_LABELS: Record<string, string> = {
  CREATED: "Pesanan Dibuat",
  PAID: "Pesanan Dibayar",
  PROCESS: "Diproses",
  PICK_STARTED: "Mulai Picking",
  PICK_FAILED: "Gagal Picking",
  FINISH_PICK: "Selesai Picking",
  PACK_STARTED: "Mulai Packing",
  FINISH_PACK: "Selesai Packing",
  LABEL_PRINTED: "Cetak Label",
  READY_TO_SHIP: "Siap Kirim",
  DRIVER_CALLED: "Driver Dipanggil",
  TRACKING_UPDATED: "No. Resi Diperbarui",
  CHANNEL_STATUS: "Status Channel Berubah",
  RECEIVED_BY_BUYER: "Diterima Pembeli",
  RETURN_DECISION: "Keputusan Retur",
  RETURN_CREATED: "Dokumen Retur Dibuat",
  RETURN_ACCEPTED: "Retur Disetujui",
  RETURN_REJECTED: "Retur Ditolak",
  RETURN_INBOUND_CREATED: "Penerimaan Retur Dibuat",
  RETURN_RECEIVED: "Paket Retur Diterima",
  RETURN_PUTAWAY_COMPLETED: "Putaway Retur Selesai",
  RETURN_COMPLETED: "Retur Selesai",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  ZONE_ASSIGNED: "Zona Ditetapkan",
  ITEM_CREATED: "Item Dibuat",
  ADDED_TO_SHIPMENT: "Masuk ke Pengiriman",
  REMOVED_FROM_SHIPMENT: "Dikeluarkan dari Pengiriman",
  SHIPMENT_HANDED_OVER: "Handover Pengiriman",
  FIELD_CHANGED: "Perubahan Data",
};

export function labelForField(key: string): string {
  return RIWAYAT_FIELD_LABELS[key] ?? key;
}

export function labelForAction(action: string): string {
  return RIWAYAT_ACTION_LABELS[action] ?? action;
}

export function formatRiwayatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
