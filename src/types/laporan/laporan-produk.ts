export interface SalesProductParams {
  from: string;
  to: string;
  location_ids?: string[];
  item_ids?: string[];
  format?: "excel" | "pdf";
}

export interface SkuOption {
  id: string;
  sku: string;
  name: string;
  image_url: string | null;
}
