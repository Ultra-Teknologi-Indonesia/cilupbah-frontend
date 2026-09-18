export type SalesReturnStatus =
  "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED" | "CANCELLED";

export type SalesReturnReasonCategory =
  "FAILED_DELIVERY" | "COMPLAINT" | "CANCEL_SHIPPED" | "REMORSE" | "OTHER";

export type SalesReturnMarketplaceDecision =
  | "MP_PENDING"
  | "MP_APPROVED"
  | "MP_REJECTED"
  | "MP_DISPUTE"
  | "MP_JUDGING"
  | "MP_REFUNDED"
  | "MP_CLOSED"
  | "MP_NOT_RETURN";

export interface SalesReturnAppeal {
  id: string;
  sales_return_id: string;
  record_type: string;
  operator: "BUYER" | "SELLER" | "PLATFORM";
  description: string | null;
  recorded_at: string;
  created_at: string;
}

export interface SalesReturnItem {
  id: string;
  sales_return_id: string;
  item_id: string;
  qty: number;
  approved_qty?: number | null;
  condition?: string | null;
  reason?: string | null;
  notes?: string | null;

  product?: {
    id: string;
    sku: string;
    product?: { id: string; name: string } | null;
  } | null;
}

export interface SalesReturn {
  id: string;
  return_number: string;
  order_id: string | null;
  location_id: string;
  source: "manual" | "marketplace";
  channel_return_id?: string | null;
  channel?: string | null;
  channel_name?: string | null;
  channel_shop_name?: string | null;
  customer_name: string | null;
  customer_contact: string | null;
  status: SalesReturnStatus;
  reason: string | null;
  reason_category: SalesReturnReasonCategory | null;
  notes: string | null;
  return_tracking_number?: string | null;
  return_carrier?: string | null;
  return_shipped_at?: string | null;
  tracking_synced_at?: string | null;
  marketplace_decision?: SalesReturnMarketplaceDecision | null;
  marketplace_decision_at?: string | null;
  marketplace_raw_status?: string | null;
  channel_reason_code?: string | null;
  channel_reason_text?: string | null;
  reason_display?: string | null;
  marketplace_decision_label?: string | null;
  marketplace_raw_status_label?: string | null;
  refund_amount?: number | null;
  refund_currency?: string | null;
  shipping_fee_original?: number | null;
  shipping_fee_return?: number | null;
  detail_synced_at?: string | null;
  created_by: string;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  order?: {
    id: string;
    salesorder_no?: string;
    customer_name?: string | null;
    tracking_number?: string | null;
    shipping_provider?: string | null;
  } | null;
  location?: { id: string; location_name: string } | null;
  items: SalesReturnItem[];
}

export interface SalesReturnItemInput {
  item_id: string;
  qty: number;
  condition?: string;
  notes?: string;
}

export interface SalesReturnFormData {
  order_id?: string;
  location_id: string;
  source?: "manual" | "marketplace";
  customer_name?: string;
  customer_contact?: string;
  reason?: string;
  notes?: string;
  created_by: string;
  items: SalesReturnItemInput[];
}

export interface SalesReturnListParams {
  search?: string;
  page?: number;
  per_page?: number;
  "filter[status]"?: string;
  "filter[source]"?: string;
  "filter[location_id]"?: string;
  "filter[channel_shop_id]"?: string;
  "filter[reason]"?: string;
  "filter[date_from]"?: string;
  "filter[date_to]"?: string;
  sort?: string;
}

export interface SalesReturnFilterOption {
  value: string;
  label: string;
  channel?: string;
  channel_name?: string;
}

export interface SalesReturnFilterOptions {
  reasons: SalesReturnFilterOption[];
  shops: SalesReturnFilterOption[];
}
