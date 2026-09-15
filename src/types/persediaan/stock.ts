export interface LocationStock {
  item_id: string;
  location_id: string;
  location_name: string;
  on_hand: number;
  pending_placement?: number;
  legacy_unassigned?: number;
  physical_total?: number;
  on_order: number;
  available: number;
}

export interface TotalStocks {
  on_hand: number;
  pending_placement?: number;
  legacy_unassigned?: number;
  physical_total?: number;
  on_order: number;
  available: number;

  transit: number;

  /** Sudah diambil dari rak tapi belum dikemas — fisiknya di meja packing. */
  picked_not_packed: number;
  /** Yang masih ada di rak. Dihitung di backend, jangan diturunkan di sini. */
  actual: number;
}

export interface VariationValue {
  label: string;
  value: string;
}

export interface StockItem {
  item_id: string;
  item_code: string;
  item_name: string;
  item_group_id: string;
  is_bundle: boolean;
  variation_values: VariationValue[];
  stock_this: boolean;
  average_cost: string | number;
  average_cost_source:
    "purchase_weighted_average" | "positive_inventory_fallback" | "unavailable";
  location_stocks: LocationStock[];
  total_stocks: TotalStocks;
  thumbnail: string | null;
}

export type MovementView = "clean" | "attention" | "all";

export interface StockMovementEffect {
  type: "reservation_release" | "physical_restore";
  label: string;
  quantity_label: "tersedia" | "fisik";
  description: string;
}

export interface StockMovement {
  id: string;
  item_id: string;
  sku: string | null;
  product_id: string | null;
  location_id: string;
  location_name: string;
  bin_id: string | null;
  bin_code: string | null;
  transaction_number: string;
  order_no: string | null;
  order_count: number | null;
  reference_number: string | null;
  note: string | null;
  source: string;
  source_category: string;
  source_label: string;
  stock_effect?: StockMovementEffect | null;
  workflow: {
    type: "transfer";
    label: string;
    order: number;
  } | null;
  is_variance: boolean;
  direction: "in" | "out" | "none";
  qty: number;
  balance: number;
  placed_balance?: number;
  pending_placement_balance?: number;
  legacy_unassigned_balance?: number;
  physical_total_balance?: number;
  on_order_balance?: number;
  available_balance?: number;
  /** Current placed stock snapshot, independent of the selected history view. */
  current_balance?: number;
  current_available_balance?: number;
  transaction_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BinInventory {
  id: string;
  item_id: string;
  location_id: string;
  location_name: string;
  bin_id: string | null;
  bin_code: string | null;
  floor_code: string | null;
  row_code: string | null;
  column_code: string | null;
  zone_id: string | null;
  zone_code: string | null;
  zone_name: string | null;
  batch_no: string | null;
  serial_no: string | null;
  expired_date: string | null;
  on_hand: number;
  on_order: number;
  available: number;

  /** Sudah diambil dari rak ini tapi belum dikemas. */
  picked_not_packed: number;
  /** Yang masih ada di rak ini. Dihitung di backend. */
  actual: number;
  avg_cost: number;
}

export interface StockListParams {
  search?: string;
  page?: number;
  per_page?: number;
  "filter[product_id]"?: string;
  "filter[location_id]"?: string;
  "filter[is_bundle]"?: string;
  "filter[channel]"?: string;
  sort?: string;
}

export interface StockMovementParams {
  page?: number;
  per_page?: number;
  view?: MovementView;
  "filter[item_id]"?: string;
  "filter[location_id]"?: string;
  "filter[store_id]"?: string;
  "filter[source]"?: string;

  "filter[drill]"?: "transit" | "allocation" | "order_active";
  "filter[direction]"?: "in" | "out";
  "filter[date_from]"?: string;
  "filter[date_to]"?: string;
  sort?: string;
}

export interface StockChannel {
  channel_id: string;
  channel_code: string;
  channel_name: string;
  store_name: string;
  store_id: string;
}

export interface StockLocation {
  location_id: string;
  location_name: string;
}

export interface MovementSourceOption {
  value: string;
  label: string;
  category: string;
}

export interface MovementDirectionOption {
  value: "in" | "out";
  label: string;
}

export interface MovementFilterOption {
  value: string;
  label: string;
}

export interface MovementFilterOptions {
  sources: MovementSourceOption[];
  directions: MovementDirectionOption[];
  locations: MovementFilterOption[];
  stores: MovementFilterOption[];
}

export interface StockListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  channels: StockChannel[];
  locations: StockLocation[];
}
