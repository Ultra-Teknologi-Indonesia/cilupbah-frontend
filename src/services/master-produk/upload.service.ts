import { fetchClient } from "@/lib/api-client";
import type { ApiPaginated, ApiResponse } from "@/types/api.types";

export type DraftStatus = "draft" | "ready" | "cancelled";

export interface UploadListingParams {
  isUploaded?: boolean;
  search?: string;
  channel?: string;
  page?: number;
  perPage?: number;
}

interface RawUploadListing {
  item_group_id: string;
  item_group_name: string | null;
  store_id: string;
  shop_id: string | null;
  store_name: string | null;
  channel_id: string | null;
  channel_code: string | null;
  channel_name: string | null;
  is_uploaded: boolean;
  channel_group_id: string | null;
  sync_status: string | null;
  product_channels: Array<{
    master_sku: string | null;
    channel_sku: string | null;
    variation: string | null;
  }>;
}

export interface UploadDestination {
  itemGroupId: string;
  itemGroupName: string | null;

  storeId: string;

  shopId: string | null;
  storeName: string | null;
  channelId: string | null;
  channelCode: string | null;
  channelName: string | null;
  isUploaded: boolean;
  channelGroupId: string | null;
  syncStatus: string | null;
  productChannels: Array<{
    masterSku: string | null;
    channelSku: string | null;
    variation: string | null;
  }>;
}

export interface UploadListingResult {
  items: UploadDestination[];
  meta: ApiPaginated<RawUploadListing>["meta"];
}

function mapDestination(raw: RawUploadListing): UploadDestination {
  return {
    itemGroupId: raw.item_group_id,
    itemGroupName: raw.item_group_name,
    storeId: raw.store_id,
    shopId: raw.shop_id,
    storeName: raw.store_name,
    channelId: raw.channel_id,
    channelCode: raw.channel_code,
    channelName: raw.channel_name,
    isUploaded: raw.is_uploaded,
    channelGroupId: raw.channel_group_id,
    syncStatus: raw.sync_status,
    productChannels: (raw.product_channels ?? []).map((p) => ({
      masterSku: p.master_sku,
      channelSku: p.channel_sku,
      variation: p.variation,
    })),
  };
}

export interface RulesSummary {
  requiredCertsCount: number;
  sizeChartRequired: boolean;
  hasSpecialRequirements: boolean;
}

export interface MatchRow {
  storeId: string;
  channelGroupId: string | null;
  message: string;
  matched: boolean;
  rulesSummary: RulesSummary | null;
}

interface RawMatchRow {
  store_id: string;
  channel_group_id: string | null;
  message: string;
  matched: boolean;
  rules_summary: {
    required_certs_count: number;
    size_chart_required: boolean;
    has_special_requirements: boolean;
  } | null;
}

export interface DraftParams {
  search?: string;
  status?: DraftStatus;
  channel?: string;
  page?: number;
  perPage?: number;
}

interface RawDraft {
  id: string;
  item_group_id: string;
  item_group_name: string | null;
  thumbnail: string | null;
  status: DraftStatus;
  can_upload: boolean;
  shop_name: string | null;
  channel_code: string | null;
  channel_name: string | null;
  store_id: string | null;
  price_override: number | null;
}

export interface DraftRow {
  id: string;
  itemGroupId: string;
  itemGroupName: string | null;
  thumbnail: string | null;
  status: DraftStatus;
  canUpload: boolean;
  storeName: string | null;
  channelCode: string | null;
  channelName: string | null;
  storeId: string | null;
  priceOverride: number | null;
}

function mapDraft(raw: RawDraft): DraftRow {
  return {
    id: raw.id,
    itemGroupId: raw.item_group_id,
    itemGroupName: raw.item_group_name,
    thumbnail: raw.thumbnail,
    status: raw.status,
    canUpload: raw.can_upload,
    storeName: raw.shop_name,
    channelCode: raw.channel_code,
    channelName: raw.channel_name,
    storeId: raw.store_id,
    priceOverride: raw.price_override,
  };
}

export interface HistoryParams {
  search?: string;
  status?: string;
  channel?: string;
  shopId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
}

export type HistoryStatus = "success" | "failed" | "pending";
export type ErrorCategory = "token" | "retryable" | "user_fixable" | "fatal";

interface RawHistoryError {
  category: ErrorCategory;
  title: string;
  reason: string;
  action: string | null;
  detail: string | null;
  retryable: boolean;
}

interface RawHistory {
  id: string;
  item_group_id: string;
  item_group_name: string | null;
  thumbnail: string | null;
  upload_date: string | null;
  success: boolean;
  status: HistoryStatus | null;
  status_message: string | null;
  error: RawHistoryError | null;
  can_reupload: boolean;
  shop_name: string | null;
  channel_code: string | null;
  channel_name: string | null;
  store_id: string | null;
  channel_url: string | null;
}

export interface HistoryError {
  category: ErrorCategory;
  title: string;
  reason: string;
  action: string | null;
  detail: string | null;
  retryable: boolean;
}

export interface HistoryRow {
  id: string;
  itemGroupId: string;
  itemGroupName: string | null;
  thumbnail: string | null;
  uploadDate: string | null;
  success: boolean;
  status: HistoryStatus;
  statusMessage: string | null;
  error: HistoryError | null;
  canReupload: boolean;
  storeName: string | null;
  channelCode: string | null;
  channelName: string | null;
  storeId: string | null;
  channelUrl: string | null;
}

function mapHistory(raw: RawHistory): HistoryRow {
  return {
    id: raw.id,
    itemGroupId: raw.item_group_id,
    itemGroupName: raw.item_group_name,
    thumbnail: raw.thumbnail,
    uploadDate: raw.upload_date,
    success: raw.success,
    status: raw.status ?? (raw.success ? "success" : "failed"),
    statusMessage: raw.status_message,
    error: raw.error,
    canReupload: raw.can_reupload,
    storeName: raw.shop_name,
    channelCode: raw.channel_code,
    channelName: raw.channel_name,
    storeId: raw.store_id,
    channelUrl: raw.channel_url,
  };
}

export interface BulkUploadResult {
  uploaded: number;
  skipped: { id: string; reason: string }[];
}

interface RawRequiredAttributeOption {
  external_id: string;
  name: string;
}

interface RawRequiredAttribute {
  external_id: string;
  name: string;
  is_covered: boolean;
  options: RawRequiredAttributeOption[];
}

interface RawCategoryRules {
  cod?: { is_supported?: boolean };
  epr?: { is_required?: boolean };
  manufacturer?: { is_required?: boolean };
  package_dimension?: { is_required?: boolean };
  product_certifications?: Array<{
    id: string;
    name: string;
    is_required?: boolean;
    document_details?: string;
    sample_image_url?: string;
  }>;
  responsible_person?: { is_required?: boolean };
  size_chart?: { is_required?: boolean; is_supported?: boolean };
}

interface RawRequiredAttributesData {
  channel_category_id: string | null;
  attributes: RawRequiredAttribute[];
  rules: RawCategoryRules | null;
}

export interface RequiredAttributeOption {
  externalId: string;
  name: string;
}

export interface RequiredAttribute {
  externalId: string;
  name: string;
  isCovered: boolean;
  options: RequiredAttributeOption[];
}

export interface CategoryCertification {
  id: string;
  name: string;
  isRequired: boolean;
  documentDetails?: string;
  sampleImageUrl?: string;
}

export interface CategoryRules {
  cod: { isSupported: boolean };
  manufacturer: { isRequired: boolean };
  packageDimension: { isRequired: boolean };
  productCertifications: CategoryCertification[];
  sizeChart: { isRequired: boolean; isSupported: boolean };
}

export interface RequiredAttributesResult {
  channelCategoryId: string | null;
  attributes: RequiredAttribute[];
  rules: CategoryRules | null;
}

export const UploadService = {
  listing: async (
    productId: string,
    params: UploadListingParams = {},
  ): Promise<UploadListingResult> => {
    const q = new URLSearchParams();
    q.set("is_uploaded", params.isUploaded ? "true" : "false");
    if (params.search) q.set("search", params.search);
    if (params.channel) q.set("filter[channel]", params.channel);
    q.set("page", String(params.page ?? 1));
    q.set("per_page", String(params.perPage ?? 25));

    const res = await fetchClient<ApiPaginated<RawUploadListing>>(
      `/products/${productId}/upload-listing?${q.toString()}`,
    );
    return { items: (res.data ?? []).map(mapDestination), meta: res.meta };
  },

  match: async (productId: string, storeIds: string[]): Promise<MatchRow[]> => {
    const res = await fetchClient<ApiResponse<RawMatchRow[]>>(
      `/products/${productId}/upload-listing/match`,
      { method: "POST", data: { store_ids: storeIds } },
    );
    return (res.data ?? []).map((r) => ({
      storeId: r.store_id,
      channelGroupId: r.channel_group_id,
      message: r.message,
      matched: r.matched,
      rulesSummary: r.rules_summary
        ? {
            requiredCertsCount: r.rules_summary.required_certs_count,
            sizeChartRequired: r.rules_summary.size_chart_required,
            hasSpecialRequirements: r.rules_summary.has_special_requirements,
          }
        : null,
    }));
  },

  createDraft: async (
    productId: string,
    shopId: string,
  ): Promise<{ id: string }> => {
    const res = await fetchClient<ApiResponse<{ id: string }>>(
      `/products/${productId}/channel-drafts`,
      { method: "POST", data: { shop_id: shopId, status: "ready" } },
    );
    return res.data;
  },

  createDrafts: async (
    productId: string,
    shopIds: string[],
    attributeMapping?: Record<string, string> | null,
  ): Promise<{ draft_ids: string[] }> => {
    const res = await fetchClient<ApiResponse<{ draft_ids: string[] }>>(
      `/products/${productId}/channel-drafts/bulk-create`,
      {
        method: "POST",
        data: {
          shop_ids: shopIds,
          status: "ready",
          ...(attributeMapping && Object.keys(attributeMapping).length > 0
            ? { attribute_mapping: attributeMapping }
            : {}),
        },
      },
    );
    return res.data;
  },

  bulkUpload: async (draftIds: string[]): Promise<BulkUploadResult> => {
    const res = await fetchClient<ApiResponse<BulkUploadResult>>(
      `/products/channel-drafts/bulk-upload`,
      { method: "POST", data: { ids: draftIds } },
    );
    return res.data;
  },

  uploadToStores: async (
    productId: string,
    shopIds: string[],
  ): Promise<BulkUploadResult> => {
    const drafts = await UploadService.createDrafts(productId, shopIds);
    return UploadService.bulkUpload(drafts.draft_ids);
  },

  fetchRequiredAttributes: async (
    productId: string,
    shopId: string,
  ): Promise<RequiredAttributesResult> => {
    const res = await fetchClient<ApiResponse<RawRequiredAttributesData>>(
      `/products/${productId}/channel-drafts/required-attributes?shop_id=${encodeURIComponent(shopId)}`,
    );
    const raw = res.data;
    const rawRules = raw.rules;
    return {
      channelCategoryId: raw.channel_category_id,
      attributes: (raw.attributes ?? []).map((a) => ({
        externalId: a.external_id,
        name: a.name,
        isCovered: a.is_covered,
        options: (a.options ?? []).map((o) => ({
          externalId: o.external_id,
          name: o.name,
        })),
      })),
      rules: rawRules
        ? {
            cod: { isSupported: rawRules.cod?.is_supported ?? false },
            manufacturer: {
              isRequired: rawRules.manufacturer?.is_required ?? false,
            },
            packageDimension: {
              isRequired: rawRules.package_dimension?.is_required ?? false,
            },
            productCertifications: (rawRules.product_certifications ?? []).map(
              (c) => ({
                id: c.id,
                name: c.name,
                isRequired: c.is_required ?? false,
                documentDetails: c.document_details,
                sampleImageUrl: c.sample_image_url,
              }),
            ),
            sizeChart: {
              isRequired: rawRules.size_chart?.is_required ?? false,
              isSupported: rawRules.size_chart?.is_supported ?? false,
            },
          }
        : null,
    };
  },

  createDraftWithAttributes: async (
    productId: string,
    shopId: string,
    attributeMapping: Record<string, string> | null,
  ): Promise<{ id: string }> => {
    const res = await fetchClient<ApiResponse<{ id: string }>>(
      `/products/${productId}/channel-drafts`,
      {
        method: "POST",
        data: {
          shop_id: shopId,
          status: "ready",
          ...(attributeMapping && Object.keys(attributeMapping).length > 0
            ? { attribute_mapping: attributeMapping }
            : {}),
        },
      },
    );
    return res.data;
  },

  uploadToStoresWithAttributes: async (
    productId: string,
    shopIds: string[],
    attributeMapping: Record<string, string> | null,
  ): Promise<BulkUploadResult> => {
    const drafts = await UploadService.createDrafts(
      productId,
      shopIds,
      attributeMapping,
    );
    return UploadService.bulkUpload(drafts.draft_ids);
  },

  drafts: async (
    params: DraftParams = {},
  ): Promise<{ items: DraftRow[]; meta: ApiPaginated<RawDraft>["meta"] }> => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("filter[status]", params.status);
    if (params.channel) q.set("filter[channel]", params.channel);
    q.set("page", String(params.page ?? 1));
    q.set("per_page", String(params.perPage ?? 25));

    const res = await fetchClient<ApiPaginated<RawDraft>>(
      `/products/channel-drafts?${q.toString()}`,
    );
    return { items: (res.data ?? []).map(mapDraft), meta: res.meta };
  },

  deleteDraft: async (productId: string, draftId: string): Promise<void> => {
    await fetchClient(`/products/${productId}/channel-drafts/${draftId}`, {
      method: "DELETE",
    });
  },

  uploadDraft: async (draftId: string): Promise<void> => {
    await fetchClient(`/products/channel-drafts/${draftId}/upload`, {
      method: "POST",
    });
  },

  histories: async (
    params: HistoryParams = {},
  ): Promise<{
    items: HistoryRow[];
    meta: ApiPaginated<RawHistory>["meta"];
  }> => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("filter[status]", params.status);
    if (params.channel) q.set("filter[channel]", params.channel);
    if (params.shopId) q.set("filter[shop_id]", params.shopId);
    if (params.dateFrom) q.set("filter[date_from]", params.dateFrom);
    if (params.dateTo) q.set("filter[date_to]", params.dateTo);
    q.set("page", String(params.page ?? 1));
    q.set("per_page", String(params.perPage ?? 25));

    const res = await fetchClient<ApiPaginated<RawHistory>>(
      `/upload-histories?${q.toString()}`,
    );
    return { items: (res.data ?? []).map(mapHistory), meta: res.meta };
  },

  reupload: async (id: string): Promise<void> => {
    await fetchClient(`/upload-histories/${id}/re-upload`, { method: "POST" });
  },

  bulkDeleteHistories: async (ids: string[]): Promise<void> => {
    await fetchClient(`/upload-histories/bulk-delete`, {
      method: "POST",
      data: { ids },
    });
  },
};
