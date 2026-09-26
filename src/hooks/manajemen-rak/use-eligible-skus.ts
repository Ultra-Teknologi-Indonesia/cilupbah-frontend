"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { LocationBinService } from "@/services/manajemen-rak/location-bin.service";

interface EligibleSkuResponseItem {
  variant_id: string | number;
  sku: string;
  name: string;
  pending_qty: number;
  thumbnail?: string | null;
}

export function useEligibleSkusInfinite(
  locationId: string,
  binId: string,
  search?: string,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: ["eligible-skus", locationId, binId, search] as const,
    queryFn: async ({ pageParam = 1 }) => {
      const res = await LocationBinService.listEligibleSkus(locationId, binId, {
        search,
        page: pageParam,
        per_page: 10,
      });

      return {
        data: ((res.data ?? []) as EligibleSkuResponseItem[]).map((s) => ({
          variantId: String(s.variant_id),
          sku: s.sku,
          name: s.name,
          pendingQty: s.pending_qty,
          thumbnail: s.thumbnail ?? null,
        })),
        meta: res.meta,
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.meta) return undefined;
      const { current_page, last_page } = lastPage.meta;
      return current_page < last_page ? current_page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: Boolean(locationId && binId) && enabled,
    staleTime: 30_000,
  });
}
