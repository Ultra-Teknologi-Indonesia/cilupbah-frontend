export interface SalesListParams {
  from: string;
  to: string;
  location_ids?: string[];
  format?: "excel" | "pdf";
}
