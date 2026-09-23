export type StockReplenishmentStatus =
  "PENDING" | "ACCEPTED" | "REJECTED" | "DONE" | "CANCELLED";

export interface StockReplenishmentReasonDetail {
  type: "stock_shortage" | "auto_safe_stock";
  label: string;
  demand_qty: number;
  available_qty: number;
  in_flight_qty: number;
  suggested_qty: number;
}

export interface StockReplenishmentItem {
  id: string;
  item_id: string;
  sku: string;
  product_name: string | null;
  thumbnail_url: string | null;
  qty: number;
  reason: string | null;
  reason_detail?: StockReplenishmentReasonDetail | null;
  demand_qty?: number;
  available_qty?: number;
  in_flight_qty?: number;
  suggested_qty?: number;
}

export interface StockReplenishment {
  id: string;
  status: StockReplenishmentStatus;
  from_location_id: string;
  to_location_id: string;
  from_location_name: string | null;
  to_location_name: string | null;
  requested_by_user_id: string | null;
  requested_by_name: string | null;
  rejected_by_user_id?: string | null;
  rejected_by_name?: string | null;
  assignee_user_id: string | null;
  assignee_name: string | null;
  transfer_out_id: string | null;
  transfer_out_number: string | null;
  transfer_out_status: string | null;
  requested_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  done_at: string | null;
  reject_reason: string | null;
  note: string | null;
  items?: StockReplenishmentItem[];
  created_at?: string;
  updated_at?: string;
  source?: "MANUAL" | "MONITOR" | "AUTO" | "MIXED";
  batch_key?: string | null;
  last_reconciled_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  items_count?: number;
  items_qty?: number;
}

export interface QueueFromMonitorPayload {
  item_ids: string[];
  from_location_id?: string;
  to_location_id?: string;
}

export interface StockReplenishmentListParams {
  status?: StockReplenishmentStatus;
  page?: number;
  per_page?: number;
}

export interface StockReplenishmentItemsParams {
  page?: number;
  per_page?: number;
  search?: string;
  channel?: string;
  shop_id?: string;
}

export interface StockReplenishmentFilterOption {
  value: string;
  label: string;
  channel?: string | null;
}

export interface StockReplenishmentItemFilters {
  channels: StockReplenishmentFilterOption[];
  shops: StockReplenishmentFilterOption[];
}

export interface AcceptReplenishmentPayload {
  assignee_user_id?: string | null;
  note?: string | null;
}

export interface UpdateReplenishmentItemPayload {
  qty?: number;
  reason?: string | null;
}
