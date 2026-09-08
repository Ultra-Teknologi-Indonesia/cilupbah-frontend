export interface PenyesuaianStokPdfParams {
  start_date: string;
  end_date: string;
  product_ids?: string[];
  location_ids?: string[];
  download?: boolean;
  format?: "pdf" | "excel";
}
