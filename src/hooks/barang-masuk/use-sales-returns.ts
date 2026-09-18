"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { SalesReturnService } from "@/services/barang-masuk/sales-return.service";
import type { SalesReturnListParams } from "@/types/barang-masuk/sales-return";

const STALE = 30 * 1000;

export function useSalesReturnsUnprocessed(
  params: SalesReturnListParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ["sales-return", "unprocessed", params],
    queryFn: () => SalesReturnService.unprocessed(params),
    staleTime: STALE,
    enabled,
  });
}

export function useSalesReturns(
  params: SalesReturnListParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ["sales-return", "list", params],
    placeholderData: keepPreviousData,
    queryFn: () => SalesReturnService.list(params),
    staleTime: STALE,
    enabled,
  });
}

export function useSalesReturnFilterOptions(enabled = true) {
  return useQuery({
    queryKey: ["sales-return", "filter-options"],
    queryFn: () => SalesReturnService.filterOptions(),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useSalesReturn(id: string, enabled = true) {
  return useQuery({
    queryKey: ["sales-return", "detail", id],
    queryFn: () => SalesReturnService.getById(id),
    enabled: enabled && !!id,
    staleTime: STALE,
  });
}

export function useSalesReturnAppeals(id: string, enabled = true) {
  return useQuery({
    queryKey: ["sales-return", "appeals", id],
    queryFn: () => SalesReturnService.getAppeals(id),
    enabled: enabled && !!id,
    staleTime: STALE,
  });
}

export function useChannelRejectReasons(id: string, enabled = true) {
  return useQuery({
    queryKey: ["sales-return", "channel-reject-reasons", id],
    queryFn: () => SalesReturnService.getChannelRejectReasons(id),
    enabled: enabled && !!id,
    staleTime: STALE,
  });
}
