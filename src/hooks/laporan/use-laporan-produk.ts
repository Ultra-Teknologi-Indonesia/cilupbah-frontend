"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { useAsyncExport } from "@/hooks/laporan/use-async-export";
import { LaporanProdukService } from "@/services/laporan/laporan-produk.service";
import type { SalesProductParams } from "@/types/laporan/laporan-produk";

export function useExportSalesProduct() {
  return useAsyncExport((params: SalesProductParams) =>
    LaporanProdukService.exportSalesProduct(params),
  );
}

export function useSkuOptionsInfinite(search: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["laporan", "produk", "sku-options", search],
    queryFn: ({ pageParam }) =>
      LaporanProdukService.searchSkuOptions(search, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { current_page, last_page } = lastPage.meta;
      return current_page < last_page ? current_page + 1 : undefined;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled,
  });
}
