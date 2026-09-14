export interface PurchaseOrderItem {
  id: string;
  item_id: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    image_url?: string;
    media?: { url: string }[];
  };
  variant?: {
    id: string;
    name: string;
    media?: { url: string }[];
    options?: { value: string }[];
  };
  description: string | null;
  unit: string | null;
  qty: number;
  received_qty: number;
  accepted_qty?: number;
  rejected_qty?: number;
  rejection_notes?: string[];
  unit_price: number;
  disc: number;
  disc_amount: number;
  shipping_cost: number;
  landed_cost_per_unit?: number;
  tax_id: string | null;
  tax_amount: number;
  amount: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  contact_id: string;
  contact?: { id: string; name: string; code: string };
  location_id: string;
  location?: { id: string; location_name: string };
  status: PurchaseOrderStatus;
  order_date: string;
  expected_date: string | null;
  ref_no: string | null;
  payment_term: number | null;
  is_tax_included: boolean;
  sub_total: number;
  total_disc: number;
  total_tax: number;
  total_amount: number;
  notes: string | null;
  bills?: { id: string; bill_number: string }[];
  created_by: string;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItem[];
  qc_summary?: {
    total_accepted: number;
    total_rejected: number;
  };
  active_inbound?: {
    id: string;
    transaction_number: string;
    status: string;
  } | null;
  has_cancelled_inbound_only?: boolean;
  inbounds_count?: number;
}

export type PurchaseOrderStatus =
  "DRAFT" | "OPEN" | "PARTIAL_RECEIVED" | "FULLY_RECEIVED";

export interface PurchaseOrderListParams {
  search?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  "filter[status]"?: string;
  "filter[contact_id]"?: string;
  "filter[location_id]"?: string;
  "filter[date_from]"?: string;
  "filter[date_to]"?: string;
}

export interface PurchaseOrderItemFormData {
  id?: string;
  received_qty?: number;
  item_id: string;
  product_name?: string;
  product_sku?: string;
  description?: string | null;
  unit?: string | null;
  qty: number;
  unit_price: number;
  disc: number;
  disc_amount?: number;
  shipping_cost?: number;
  tax_id?: string;
  tax_amount?: number;
}

export interface PurchaseOrderFormData {
  po_number?: string;
  contact_id: string;
  location_id: string;
  order_date: string;
  expected_date?: string;
  ref_no?: string;
  payment_term?: number | null;
  is_tax_included?: boolean;
  notes?: string;
  items: PurchaseOrderItemFormData[];
}

export interface PurchaseOrderPatchData
  extends Partial<Omit<PurchaseOrderFormData, "items">> {
  changes?: {
    create?: Omit<PurchaseOrderItemFormData, "id" | "received_qty">[];
    update?: Array<
      { id: string } & Partial<
        Omit<PurchaseOrderItemFormData, "id" | "item_id" | "received_qty">
      >
    >;
    delete_ids?: string[];
  };
}
