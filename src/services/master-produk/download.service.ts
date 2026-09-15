import { fetchClient } from "@/lib/api-client";
import type { ApiPaginated, ApiResponse } from "@/types/api.types";
import type { HistoryError } from "@/services/master-produk/upload.service";

export type DownloadState = "queued" | "downloading" | "done" | "failed";
export type ChannelDownloadAction = "download" | "sync_bundle" | "none";

export interface DownloadTransaction {
  trxId: string;
  trxNo: string;
  externalProductId: string | null;
  executedBy: string;
  storeName: string | null;
  storeId: string | null;
  channelId: string | null;
  channelCode: string | null;
  channelName: string | null;
  createdDate: string;
  state: DownloadState;
  isDownloaded: boolean;
  onDownloadProcess: boolean;
  totalDownloaded: number;
  totalFailed: number;
  isPartial: boolean;
  allProduct: number;
  progressPercent: number;
  errorMessage: string | null;
  error: HistoryError | null;
}

interface RawDownloadTransaction {
  trx_id: string;
  trx_no: string;
  external_product_id?: string | null;
  executed_by: string;
  store_name: string | null;
  store_id: string | null;
  channel_id: string | null;
  channel_code: string | null;
  channel_name: string | null;
  created_date: string;
  state: DownloadState;
  is_downloaded: boolean;
  on_download_process: boolean;
  total_downloaded: number;
  total_failed: number;
  is_partial: boolean;
  all_product: number;
  progress_percent: number;
  error_message: string | null;
  error: HistoryError | null;
}

export interface DownloadTransactionParams {
  shopId?: string;
  state?: DownloadState;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
}

function mapTransaction(raw: RawDownloadTransaction): DownloadTransaction {
  return {
    trxId: raw.trx_id,
    trxNo: raw.trx_no,
    externalProductId: raw.external_product_id ?? null,
    executedBy: raw.executed_by,
    storeName: raw.store_name,
    storeId: raw.store_id,
    channelId: raw.channel_id,
    channelCode: raw.channel_code,
    channelName: raw.channel_name,
    createdDate: raw.created_date,
    state: raw.state,
    isDownloaded: raw.is_downloaded,
    onDownloadProcess: raw.on_download_process,
    totalDownloaded: raw.total_downloaded,
    totalFailed: raw.total_failed ?? 0,
    isPartial: raw.is_partial ?? false,
    allProduct: raw.all_product,
    progressPercent: raw.progress_percent,
    errorMessage: raw.error_message,
    error: raw.error,
  };
}

export interface DownloadTransactionItem {
  itemId: string;
  itemName: string;
  itemCode: string | null;
  imgUrl: string | null;
  channelGroupId: string | null;
  status: string;
  isMaster: boolean;
  masterItemName: string | null;
}

interface RawDownloadTransactionItem {
  item_id: string;
  item_name: string;
  item_code: string | null;
  img_url: string | null;
  channel_group_id: string | null;
  status: string;
  is_master: boolean;
  master_item_name: string | null;
}

export interface DownloadTransactionDetail {
  transaction: {
    trxNo: string;
    progressPercent: number;
    createdDate: string;
    executedBy: string;
    state: DownloadState;
    storeName: string | null;
  };
  products: DownloadTransactionItem[];
  count: number;
  percent: number;
  state: DownloadState;
  meta: ApiPaginated<RawDownloadTransactionItem>["meta"];
}

interface RawDownloadTransactionDetail {
  transaction: {
    trx_no: string;
    progress_percent: number;
    created_date: string;
    executed_by: string;
    state: DownloadState;
    store_name?: string | null;
  };
  products: RawDownloadTransactionItem[];
  count: number;
  percent: number;
  state: DownloadState;
}

export interface DownloadTransactionDetailParams {
  page?: number;
  perPage?: number;

  isMaster?: boolean;
  search?: string;
}

export interface ChannelSearchItem {
  externalProductId: string;
  name: string;
  sellerSku: string | null;
  sellerSkus: string[];
  image: string | null;
  shopId: string;
  shopName: string | null;
  channelCode: string;
  channelName?: string | null;
  alreadyDownloaded: boolean;
  downloadAction: ChannelDownloadAction;
  masterStatus?: "missing" | "active" | "deleted" | "bundle" | null;
  mappingStatus?: string | null;
  masterProductId?: string | null;
  masterProductName?: string | null;
  masterProductSku?: string | null;
  bundleMappingCount: number;
  regularMappingCount: number;
  hasBundleMapping: boolean;
  hasRegularMapping: boolean;
}

interface RawChannelSearchItem {
  external_product_id: string;
  name: string;
  seller_sku: string | null;
  seller_skus?: string[];
  image: string | null;
  shop_id: string;
  shop_name: string | null;
  channel_code: string;
  channel_name?: string | null;
  already_downloaded?: boolean;
  download_action?: ChannelDownloadAction;
  master_status?: "missing" | "active" | "deleted" | "bundle" | null;
  mapping_status?: string | null;
  master_product_id?: string | null;
  master_product_name?: string | null;
  master_product_sku?: string | null;
  bundle_mapping_count?: number;
  regular_mapping_count?: number;
  has_bundle_mapping?: boolean;
  has_regular_mapping?: boolean;
}

interface RawFailedChannelStore {
  shop_id: string;
  shop_name: string | null;
  channel: string;
  error: string;
}

function mapSearchItem(raw: RawChannelSearchItem): ChannelSearchItem {
  return {
    externalProductId: raw.external_product_id,
    name: raw.name,
    sellerSku: raw.seller_sku,
    sellerSkus: raw.seller_skus ?? (raw.seller_sku ? [raw.seller_sku] : []),
    image: raw.image,
    shopId: raw.shop_id,
    shopName: raw.shop_name,
    channelCode: raw.channel_code,
    channelName: raw.channel_name,
    alreadyDownloaded: raw.already_downloaded ?? false,
    downloadAction:
      raw.download_action ?? (raw.already_downloaded ? "none" : "download"),
    masterStatus: raw.master_status,
    mappingStatus: raw.mapping_status,
    masterProductId: raw.master_product_id,
    masterProductName: raw.master_product_name,
    masterProductSku: raw.master_product_sku,
    bundleMappingCount: raw.bundle_mapping_count ?? 0,
    regularMappingCount: raw.regular_mapping_count ?? 0,
    hasBundleMapping: raw.has_bundle_mapping ?? false,
    hasRegularMapping: raw.has_regular_mapping ?? false,
  };
}

export interface ChannelSearchPage {
  items: ChannelSearchItem[];
  nextOffset: number | null;
  hasMore: boolean;
}

export const channelSearchRowId = (
  i: Pick<ChannelSearchItem, "shopId" | "externalProductId">,
) => `${i.shopId}:${i.externalProductId}`;

export interface DownloadFailureReason {
  reason: string;
  count: number;
}

export interface DownloadFailureSample {
  externalProductId: string | null;
  title: string | null;
  reason: string;
  detail: string | null;
}

export interface DownloadFailures {
  trxId: string;
  trxNo: string;
  state: DownloadState;
  totalFailed: number;
  loggedFailures: number;
  jobError: HistoryError | null;
  reasons: DownloadFailureReason[];
  samples: DownloadFailureSample[];
}

interface RawDownloadFailures {
  trx_id: string;
  trx_no: string;
  state: DownloadState;
  total_failed: number;
  logged_failures: number;
  job_error: HistoryError | null;
  reasons: { reason: string; count: number }[];
  samples: {
    external_product_id: string | null;
    title: string | null;
    reason: string;
    detail: string | null;
  }[];
}

export const DownloadService = {
  listTransactions: async (
    params: DownloadTransactionParams = {},
  ): Promise<{
    items: DownloadTransaction[];
    meta: ApiPaginated<RawDownloadTransaction>["meta"];
  }> => {
    const q = new URLSearchParams();
    if (params.shopId) q.set("filter[shop_id]", params.shopId);
    if (params.state) q.set("filter[state]", params.state);
    if (params.dateFrom) q.set("filter[date_from]", params.dateFrom);
    if (params.dateTo) q.set("filter[date_to]", params.dateTo);
    q.set("page", String(params.page ?? 1));
    q.set("per_page", String(params.perPage ?? 25));

    const res = await fetchClient<ApiPaginated<RawDownloadTransaction>>(
      `/download-transactions?${q.toString()}`,
    );
    return { items: (res.data ?? []).map(mapTransaction), meta: res.meta };
  },

  getTransaction: async (
    id: string,
    params: DownloadTransactionDetailParams = {},
  ): Promise<DownloadTransactionDetail> => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.isMaster != null)
      q.set("filter[is_master]", params.isMaster ? "1" : "0");
    q.set("page", String(params.page ?? 1));
    q.set("per_page", String(params.perPage ?? 25));

    const res = await fetchClient<
      ApiResponse<RawDownloadTransactionDetail> & {
        meta: ApiPaginated<RawDownloadTransactionItem>["meta"];
      }
    >(`/download-transactions/${id}?${q.toString()}`);

    const d = res.data;
    return {
      transaction: {
        trxNo: d.transaction.trx_no,
        progressPercent: d.transaction.progress_percent,
        createdDate: d.transaction.created_date,
        executedBy: d.transaction.executed_by,
        state: d.transaction.state,
        storeName: d.transaction.store_name ?? null,
      },
      products: (d.products ?? []).map((p) => ({
        itemId: p.item_id,
        itemName: p.item_name,
        itemCode: p.item_code,
        imgUrl: p.img_url,
        channelGroupId: p.channel_group_id,
        status: p.status,
        isMaster: p.is_master,
        masterItemName: p.master_item_name,
      })),
      count: d.count,
      percent: d.percent,
      state: d.state,
      meta: res.meta,
    };
  },

  downloadShop: async (channel: string, shopId: string): Promise<void> => {
    await fetchClient(`/${channel}/download`, {
      method: "POST",
      data: { shop_id: shopId },
    });
  },

  downloadShopBulk: async (
    channel: string,
    shopIds: string[],
  ): Promise<void> => {
    await fetchClient(`/${channel}/download/bulk`, {
      method: "POST",
      data: { shop_ids: shopIds },
    });
  },

  searchChannel: async (params: {
    channel: string;
    shopId: string;
    q: string;
    offset?: number;
    limit?: number;
  }): Promise<ChannelSearchPage> => {
    const search = new URLSearchParams();
    search.set("shop_id", params.shopId);
    if (params.q) search.set("q", params.q);
    search.set("offset", String(params.offset ?? 0));
    search.set("limit", String(params.limit ?? 20));
    const res = await fetchClient<ApiResponse<RawChannelSearchItem[]>>(
      `/${params.channel}/download/search?${search.toString()}`,
    );
    const meta =
      (res as { meta?: { next_offset?: number | null; has_more?: boolean } })
        .meta ?? {};
    return {
      items: (res.data ?? []).map(mapSearchItem),
      nextOffset: meta.next_offset ?? null,
      hasMore: !!meta.has_more,
    };
  },

  searchUnified: async (params: {
    q: string;
    shopIds?: string[];
    limitPerShop?: number;
  }): Promise<{
    items: ChannelSearchItem[];
    meta: {
      totalFound: number;
      totalStores: number;
      failedStores: {
        shopId: string;
        shopName: string | null;
        channel: string;
        error: string;
      }[];
    };
  }> => {
    const res = await fetchClient<ApiResponse<RawChannelSearchItem[]>>(
      `/channel/download/search`,
      {
        method: "POST",
        data: {
          q: params.q,
          shop_ids: params.shopIds,
          limit_per_shop: params.limitPerShop ?? 20,
        },
      },
    );
    const rawMeta =
      (
        res as {
          meta?: {
            total_found?: number;
            total_stores?: number;
            failed_stores?: RawFailedChannelStore[];
          };
        }
      ).meta ?? {};

    return {
      items: (res.data ?? []).map(mapSearchItem),
      meta: {
        totalFound: rawMeta.total_found ?? (res.data ?? []).length,
        totalStores: rawMeta.total_stores ?? params.shopIds?.length ?? 0,
        failedStores: (rawMeta.failed_stores ?? []).map((f) => ({
          shopId: f.shop_id,
          shopName: f.shop_name,
          channel: f.channel,
          error: f.error,
        })),
      },
    };
  },

  downloadProduct: async (params: {
    channel: string;
    shopId: string;
    externalProductId: string;
  }): Promise<DownloadTransaction> => {
    const res = await fetchClient<ApiResponse<RawDownloadTransaction>>(
      `/${params.channel}/download-product`,
      {
        method: "POST",
        data: {
          shop_id: params.shopId,
          external_product_id: params.externalProductId,
        },
      },
    );

    return mapTransaction(res.data);
  },

  getFailures: async (id: string): Promise<DownloadFailures> => {
    const res = await fetchClient<ApiResponse<RawDownloadFailures>>(
      `/download-transactions/${id}/failures`,
    );
    const d = res.data;
    return {
      trxId: d.trx_id,
      trxNo: d.trx_no,
      state: d.state,
      totalFailed: d.total_failed,
      loggedFailures: d.logged_failures,
      jobError: d.job_error ?? null,
      reasons: (d.reasons ?? []).map((r) => ({
        reason: r.reason,
        count: r.count,
      })),
      samples: (d.samples ?? []).map((s) => ({
        externalProductId: s.external_product_id,
        title: s.title,
        reason: s.reason,
        detail: s.detail,
      })),
    };
  },
};
