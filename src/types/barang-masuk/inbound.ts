export type InboundType =
  "PURCHASE_ORDER" | "SALES_RETURN" | "TRANSIT_IN" | "CONSIGNMENT";

export type InboundStatus =
  | "DRAFT"
  | "PARTIAL"
  | "RECEIVED"
  | "PUTAWAY_IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type InboundPlacementStatus =
  "NOT_STARTED" | "PARTIAL" | "COMPLETED" | "CANCELLED";

export interface InboundPlacementSummary {
  received_qty: number;
  putaway_qty: number;
  pending_qty: number;
  reserved_qty: number;
  progress_percent: number;
  is_consistent: boolean;
}

export interface InboundReceipt {
  id: string;
  inbound_item_id: string;
  qty: number;
  bin_id: string | null;
  batch_no: string | null;
  serial_no: string | null;
  condition: string | null;
  received_by_user_id: string | null;
  received_by_name?: string | null;
  received_by_email?: string | null;
  received_date: string;
  bin?: { id: string; bin_final_code?: string; code?: string };
  received_by_user?: { id: string; name: string } | null;
  inbound_item?: {
    id: string;
    variant?: {
      id: string;
      sku: string;
      product?: { id: string; name: string };
    };
  };
}

export interface InboundItem {
  id: string;
  inbound_id: string;
  item_id: string;
  expected_qty: number;
  received_qty: number;
  received_total?: number;
  received_by_me?: number;
  rejected_qty: number;
  rejection_note: string | null;
  putaway_qty: number;
  reserved_qty?: number;
  discrepancy_qty: number;
  discrepancy_note: string | null;
  condition: string | null;
  variant?: {
    id: string;
    sku: string;
    item_name?: string;
    name?: string;
    media?: { url: string }[];
    options?: { value: string }[];
    product?: {
      id: string;
      name: string;
      media?: { url: string }[];
    };
    variation_values?: { label: string; value: string }[];
  };
  receipts?: InboundReceipt[];
}

export type InboundParticipantStatus = "ACTIVE" | "DONE" | "WITHDRAWN";

export interface InboundParticipant {
  id: string;
  user_id: string | null;
  user_id_snapshot?: string | null;
  name: string;
  email?: string | null;
  role: string;
  status: InboundParticipantStatus;
  joined_at: string | null;
  completed_at: string | null;
  withdrawn_at: string | null;
  withdraw_reason: string | null;
  receipts_count: number;
  receipts_qty_sum: number;
}

export interface InboundEditLock {
  locked: boolean;
  reason: "mobile_session_active" | null;
  active_participants: { user_id: string; name: string }[];
}

export interface InboundAssignment {
  id: string;
  inbound_id: string;
  assigned_to: string;
  assigned_by: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  worker?: { id: string; name: string };
  assigner?: { id: string; name: string };
}

export interface Inbound {
  id: string;
  location_id: string;
  transaction_number: string;
  reference_number: string | null;
  type: InboundType;
  source_type: string | null;
  source_id: string | null;
  status: InboundStatus;
  /** Alias eksplisit untuk status dokumen penerimaan. */
  receiving_status?: InboundStatus;
  /** Progres penempatan yang dihitung dari qty, terpisah dari status penerimaan. */
  placement_status?: InboundPlacementStatus;
  placement_summary?: InboundPlacementSummary;
  notes: string | null;
  expected_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  once_received_at: string | null;
  updated_version_at: string | null;
  received_total?: number;
  received_by_me?: number;
  location?: { id: string; location_name: string };
  assignee?: { id: string; name: string } | null;
  assignedByUser?: { id: string; name: string } | null;
  items: InboundItem[];
  assignments?: InboundAssignment[];
  participants?: InboundParticipant[];
  edit_lock?: InboundEditLock;
  receiving_started_at?: string | null;
  putaways?: {
    id: string;
    source_id: string;
    status: string;
    assignee?: {
      id: string;
      name: string;
    };
  }[];
}

export interface InboundListParams {
  search?: string;
  page?: number;
  per_page?: number;
  "filter[status]"?: string;
  "filter[type]"?: string;
  "filter[location_id]"?: string;
  "filter[source_type]"?: string;
  "filter[date_from]"?: string;
  "filter[date_to]"?: string;
  sort?: string;
}
