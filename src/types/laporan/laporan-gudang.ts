export type TransferReportJenis = "masuk" | "keluar";

export interface TransferReportParams {
  jenis: TransferReportJenis;
  from: string;
  to: string;
  item_ids?: string[];
  format?: "excel" | "pdf";
}

export type PicklistReportMode = "tanggal" | "no_picklist";

export interface PicklistExportParams {
  from: string;
  to: string;
  format?: "excel" | "pdf";
}

export interface PicklistDetailPdfParams {
  picklist_id: string;
  order_ids?: string[];
}

export interface PicklistLookupOrder {
  value: string;
  label: string;
}

export interface PicklistLookupItem {
  value: string;
  label: string;
  orders: PicklistLookupOrder[];
}

export interface ShipmentExportParams {
  from: string;
  to: string;
  courier_ids?: string[];

  status_mp?: string;
  format?: "excel" | "pdf";
}

export interface ShipmentFilterOption {
  value: string;
  label: string;
}

export interface ShipmentFilterOptions {
  couriers: ShipmentFilterOption[];
  statuses: ShipmentFilterOption[];
}

export type OrderPerformanceJenis =
  "picker" | "packer" | "shipper" | "pesanan" | "kurir";

export type OrderPerformanceMode = "detail" | "summary";

export interface PutawayListParams {
  date: string;
  location_id: string;
  putaway_ids?: string[];
  format?: "excel" | "pdf";
}

export interface PutawayPerformanceParams {
  mode: OrderPerformanceMode;
  from: string;
  to: string;
  location_ids?: string[];
  format?: "excel" | "pdf";
}

export interface ShipmentByCourierParams {
  mode: OrderPerformanceMode;
  from: string;
  to: string;
  location_ids?: string[];
  format?: "excel" | "pdf";
}

export interface OrderPerformanceParams {
  jenis: OrderPerformanceJenis;
  mode: OrderPerformanceMode;
  from: string;
  to: string;
  location_ids?: string[];
  format?: "excel" | "pdf";
}
