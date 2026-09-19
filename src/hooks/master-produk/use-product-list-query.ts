"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PaginationState, SortingState } from "@tanstack/react-table";

import type { SelectedCategory } from "@/types/master-produk";
import { useMasterProducts } from "./use-master-products";

const SORT_FIELD: Record<string, string> = {
  itemName: "name",
  lastModified: "updated_at",
};

export function useProductListQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlStatus = searchParams.get("status");

  const [search, setSearch] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [status, setStatusRaw] = React.useState<string | null>(urlStatus);
  const [prevUrlStatus, setPrevUrlStatus] = React.useState<string | null>(
    urlStatus,
  );
  const [category, setCategoryRaw] = React.useState<SelectedCategory | null>(
    null,
  );
  const [type, setTypeRaw] = React.useState<string | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 24,
  });

  const resetPage = React.useCallback(
    () => setPagination((p) => ({ ...p, pageIndex: 0 })),
    [],
  );

  if (prevUrlStatus !== urlStatus) {
    setPrevUrlStatus(urlStatus);
    setStatusRaw(urlStatus);
    resetPage();
  }

  const applySearch = React.useCallback(
    (nextSearch?: string) => {
      const trimmed = (nextSearch ?? search).trim();
      setSearch(trimmed);
      setAppliedSearch(trimmed);
      resetPage();
    },
    [search, resetPage],
  );

  const setStatus = React.useCallback(
    (v: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (v) params.set("status", v);
      else params.delete("status");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );
  const setCategory = React.useCallback(
    (v: SelectedCategory | null) => {
      setCategoryRaw(v);
      resetPage();
    },
    [resetPage],
  );
  const setType = React.useCallback(
    (v: string | null) => {
      setTypeRaw(v);
      resetPage();
    },
    [resetPage],
  );

  const reset = React.useCallback(() => {
    setSearch("");
    setAppliedSearch("");
    setCategoryRaw(null);
    setTypeRaw(null);
    setSorting([]);
    resetPage();
    if (searchParams.get("status")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("status");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [resetPage, router, pathname, searchParams]);

  const sort = sorting[0]
    ? `${sorting[0].desc ? "-" : ""}${SORT_FIELD[sorting[0].id] ?? sorting[0].id}`
    : undefined;

  const result = useMasterProducts({
    search: appliedSearch || undefined,
    status: status || undefined,
    categoryId: category?.id || undefined,
    type: type || undefined,
    sort,
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
  });

  const hasFilter = Boolean(
    search || status || category || type || sorting.length,
  );

  return {
    search,
    setSearch,
    appliedSearch,
    applySearch,
    status,
    setStatus,
    category,
    setCategory,
    type,
    setType,
    sorting,
    setSorting,
    pagination,
    setPagination,
    reset,
    hasFilter,
    result,
  };
}
