"use client";

import { useQuery } from "@tanstack/react-query";

import { OrderService } from "@/services/pesanan/order.service";
import type { OrderCountParams, OrderListParams } from "@/types/pesanan/order";
import {
  createDetailHook,
  createListHook,
  createResourceKeys,
} from "@/hooks/create-crud-hooks";

const STALE = 30_000;

export const orderKeys = {
  ...createResourceKeys("pesanan"),
  counts: ["pesanan", "counts"] as const,
  count: (params: OrderCountParams) => ["pesanan", "counts", params] as const,
  shippingProviders: (params?: Record<string, unknown>) =>
    ["pesanan", "shipping-providers", params] as const,
};

export const useOrders = createListHook(orderKeys, (params: OrderListParams) =>
  OrderService.list(params),
);

export const useOrder = createDetailHook(orderKeys, (id: string) =>
  OrderService.getById(id),
);

export function useOrderCounts(params?: OrderCountParams) {
  return useQuery({
    queryKey: params ? orderKeys.count(params) : orderKeys.counts,
    queryFn: () => OrderService.getCounts(params),
    staleTime: STALE,
  });
}

export function useOrderShippingProviders(params?: {
  tab?: string;
  sub?: string;
  channel?: string;
  store_id?: string;
  location_id?: string;
  date_from?: string;
  date_to?: string;
  status?: string[];
}) {
  return useQuery({
    queryKey: orderKeys.shippingProviders(params),
    queryFn: () => OrderService.getShippingProviders(params),
    staleTime: STALE,
  });
}
