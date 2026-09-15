export interface DashboardSummary {
  orders_total: number;
  orders_by_status: Record<string, number>;
  orders_by_channel: Record<string, number>;
  data_starts_at: string | null;
  ready_to_process: number;
  empty_stock: number;
  failed_pick: number;
  pending_cancel: number;
  in_transit: number;
  stock_habis: number;
  stock_menipis: number;
  returns_pending: number;
  integration: DashboardIntegrationOverview;
}

export type DashboardIntegrationStatus =
  "normal" | "warning" | "error" | "inactive";

export interface DashboardIntegrationStore {
  id: string;
  shop_name: string | null;
  channel: {
    code: string | null;
    name: string | null;
  };
  status: DashboardIntegrationStatus;
  last_synced_at: string | null;
}

export interface DashboardIntegrationOverview {
  total: number;
  healthy: number;
  attention: number;
  inactive: number;
  stores: DashboardIntegrationStore[];
}

export interface DashboardSummaryParams {
  date_from?: string;
  date_to?: string;
  location_id?: string;
}

export type DashboardQueue =
  "ready-to-process" | "empty-stock" | "failed-pick" | "pending-cancel";

export interface DashboardQueueRow {
  id: string;
  salesorder_no: string | null;
  source: string | null;
  customer_name: string | null;
  transaction_date: string | null;
}

export interface DashboardQueueParams {
  page?: number;
  per_page?: number;
  location_id?: string;
}
