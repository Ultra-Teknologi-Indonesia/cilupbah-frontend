import { fetchClient } from "@/lib/api-client";
import type { ApiPaginated, ApiResponse } from "@/types/api.types";

export interface ChannelListingVariant {
  masterSku: string | null;
  channelSku: string | null;
  variation: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  thumbnail: string | null;
}

export interface ChannelListing {
  mappingId: string | null;

  channelGroupId: string | null;

  storeId: string | null;

  shopId: string | null;
  itemGroupName: string | null;
  storeName: string | null;
  channelId: string | null;
  channelCode: string | null;
  channelUrl: string | null;
  syncStatus: string | null;
  errorMessage: string | null;
  hasProductData: boolean;
  thumbnail: string | null;
  variants: ChannelListingVariant[];
}

export interface ChannelListingParams {
  search?: string;

  shopId?: string;
  channel?: string;
  syncStatus?: string;

  minPrice?: number;

  maxPrice?: number;
  page?: number;
  perPage?: number;
}

export interface ChannelListingResult {
  items: ChannelListing[];
  meta: ApiPaginated<RawChannelListing>["meta"];
}

interface RawConnection {
  master_sku: string | null;
  channel_sku: string | null;
  product_variation: string | null;
  min_price: number | null;
  max_price: number | null;
  thumbnail: string | null;
}

interface RawChannelListing {
  mapping_id: string | null;
  channel_group_id: string | null;
  store_id: string | null;
  shop_id: string | null;
  item_group_name: string | null;
  min: string | null;
  channel_id: string | null;
  channel_code: string | null;
  channel_url: string | null;
  sync_status: string | null;
  error_message: string | null;
  has_product_data: boolean;
  product: RawConnection[];
}

export const channelListingRowId = (
  l: Pick<ChannelListing, "storeId" | "channelGroupId">,
) => `${l.storeId ?? ""}:${l.channelGroupId ?? ""}`;

function mapListing(raw: RawChannelListing): ChannelListing {
  const variants: ChannelListingVariant[] = (raw.product ?? []).map((p) => ({
    masterSku: p.master_sku,
    channelSku: p.channel_sku,
    variation: p.product_variation,
    minPrice: p.min_price,
    maxPrice: p.max_price,
    thumbnail: p.thumbnail || null,
  }));

  return {
    mappingId: raw.mapping_id,
    channelGroupId: raw.channel_group_id,
    storeId: raw.store_id,
    shopId: raw.shop_id,
    itemGroupName: raw.item_group_name,
    storeName: raw.min,
    channelId: raw.channel_id,
    channelCode: raw.channel_code,
    channelUrl: raw.channel_url,
    syncStatus: raw.sync_status,
    errorMessage: raw.error_message,
    hasProductData: raw.has_product_data,
    thumbnail: variants.find((v) => v.thumbnail)?.thumbnail ?? null,
    variants,
  };
}

export const ChannelProductService = {
  list: async (
    params: ChannelListingParams = {},
  ): Promise<ChannelListingResult> => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.shopId) q.set("filter[shop_id]", params.shopId);
    if (params.channel) q.set("filter[channel]", params.channel);
    if (params.syncStatus) q.set("filter[sync_status]", params.syncStatus);
    if (params.minPrice != null)
      q.set("filter[min_price]", String(params.minPrice));
    if (params.maxPrice != null)
      q.set("filter[max_price]", String(params.maxPrice));
    q.set("page", String(params.page ?? 1));
    q.set("per_page", String(params.perPage ?? 25));

    const res = await fetchClient<ApiPaginated<RawChannelListing>>(
      `/products/channel-products?${q.toString()}`,
    );
    return { items: (res.data ?? []).map(mapListing), meta: res.meta };
  },

  show: async (id: string): Promise<ChannelListing> => {
    const res = await fetchClient<ApiResponse<RawChannelListing>>(
      `/products/channel-products/${id}`,
    );
    return mapListing(res.data);
  },

  unlink: async (
    channel: string,
    externalProductId: string,
    shopId: string,
  ): Promise<void> => {
    await fetchClient(`/${channel}/products/${externalProductId}/link`, {
      method: "DELETE",
      data: { shop_id: shopId },
    });
  },

  bulkUnlink: async (
    items: Array<{
      channel: string;
      externalProductId: string;
      shopId: string;
    }>,
  ) => {
    const res = await fetchClient<
      ApiResponse<{
        processed: number;
        succeeded: number;
        failed: Array<{ external_product_id: string; message: string }>;
        results: Array<{ external_product_id: string; status: "success" | "failed"; message?: string }>;
      }>
    >("/products/channel-products/bulk-unlink", {
      method: "POST",
      data: {
        items: items.map((item) => ({
          channel: item.channel,
          external_product_id: item.externalProductId,
          shop_id: item.shopId,
        })),
      },
    });
    return res.data;
  },

  activate: async (
    channel: string,
    externalProductId: string,
    shopId: string,
  ): Promise<void> => {
    await fetchClient(`/${channel}/products/${externalProductId}/activate`, {
      method: "PUT",
      data: { shop_id: shopId },
    });
  },

  deactivate: async (
    channel: string,
    externalProductId: string,
    shopId: string,
  ): Promise<void> => {
    await fetchClient(`/${channel}/products/${externalProductId}/deactivate`, {
      method: "PUT",
      data: { shop_id: shopId },
    });
  },

  syncPriceStock: async (
    channel: string,
    externalProductId: string,
    shopId: string,
  ): Promise<void> => {
    await fetchClient(`/${channel}/products/${externalProductId}/stock`, {
      method: "PUT",
      data: { shop_id: shopId },
    });
  },
};
