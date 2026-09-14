export interface ImportPreviewItem {
  row_no: number;
  item_id: string;
  sku: string;
  product_name: string;
  bin_id: string;
  bin_code: string;
  mode: "DELTA" | "FINAL";
  input_value: number;
  system_qty: number;
  actual_qty: number;
  difference: number;
  unit_cost: number | null;
  notes: string | null;
}

export interface ImportPreviewError {
  row: number;
  field: string;
  error: string;
}

export interface ImportPreviewWarning {
  row: number;
  field: string;
  warning: string;
}

export interface ImportPreviewSummary {
  total_rows: number;
  valid: number;
  errors: number;
  warnings: number;
}

export interface ImportPreviewPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ImportPreviewQuery {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
}

export interface ImportPreviewResponse {
  token: string;
  items: ImportPreviewItem[];
  errors: ImportPreviewError[];
  warnings: ImportPreviewWarning[];
  summary: ImportPreviewSummary;
  pagination?: ImportPreviewPagination;
  query?: {
    search: string;
    sort: string;
  };
}

export interface ImportConfirmPayload {
  preview_token: string;
  transaction_date: string;
  created_by: string;
  notes?: string;
  adjustment_no?: string;
}
