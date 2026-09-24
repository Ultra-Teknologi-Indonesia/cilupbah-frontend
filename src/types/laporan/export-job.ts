export type ExportJobState =
  | "queued"
  | "processing"
  | "ready"
  | "failed"
  | "expired";

export type ExportJobCategory =
  | "inventory"
  | "warehouse"
  | "sales"
  | "purchase"
  | "other";

export type ExportJobFormat = "pdf" | "xlsx" | "csv";
export type ExportJobPageSize = 20 | 50 | 100 | 200;

export interface ExportJobStatus {
  id: string;
  type: string;
  label: string;
  category: ExportJobCategory;
  format: ExportJobFormat;
  filter_summary: string | null;
  status: ExportJobState;
  file_name: string | null;
  file_size: number | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  file_available: boolean;
  file_purged_at: string | null;
  expires_at: string | null;
  error: string | null;
  download_url: string | null;
}

export interface ExportJobListParams {
  search?: string;
  category?: ExportJobCategory;
  type?: string;
  status?: ExportJobState;
  format?: ExportJobFormat;
  created_from?: string;
  created_to?: string;
  sort?: "created_at" | "finished_at" | "status" | "type" | "file_name" | "file_purged_at";
  direction?: "asc" | "desc";
  page?: number;
  per_page?: ExportJobPageSize;
}
