"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, SearchXIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SimplePagination,
  TABLE_PAGE_SIZES,
} from "@/components/ui/simple-pagination";
import { OrderCard } from "./order-card";
import type { Order, OrderTab, SubFilter } from "@/types/pesanan/order";
import { TABS_WITH_ACTIONS } from "@/types/pesanan/order";

export function OrderCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4 shadow-2xs backdrop-blur-xs">
      {/* Top row: Checkbox, Store, SO Number, Date, Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="size-4 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-5 w-36 rounded-lg" />
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      {/* Middle row: Items, Shipping, Pricing */}
      <div className="grid grid-cols-1 gap-4 py-3 sm:grid-cols-12">
        {/* Item summary */}
        <div className="flex items-center gap-3 sm:col-span-6">
          <Skeleton className="size-11 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <Skeleton className="h-4 w-4/5 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
          <Skeleton className="h-4 w-10 rounded shrink-0" />
        </div>

        {/* Shipping details */}
        <div className="space-y-1.5 sm:col-span-3 border-t sm:border-t-0 sm:border-l border-border/40 pt-2 sm:pt-0 sm:pl-4">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>

        {/* Total & Payment */}
        <div className="flex flex-col sm:items-end justify-center space-y-1.5 sm:col-span-3 border-t sm:border-t-0 border-border/40 pt-2 sm:pt-0">
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>

      {/* Bottom row: SLA / History info and action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
        <Skeleton className="h-4 w-36 rounded" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

interface OrderCardListProps {
  orders: Order[];
  tab: OrderTab;
  subFilter: SubFilter;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  isLoading: boolean;
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (p: number) => void;
  onPerPageChange: (s: number) => void;
  isFetching?: boolean;
}

export function OrderCardList({
  orders,
  tab,
  subFilter,
  selectedIds,
  onSelectionChange,
  isLoading,
  page,
  lastPage,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
  isFetching = false,
}: OrderCardListProps) {
  const selectable = TABS_WITH_ACTIONS.has(tab);

  // Progressive streaming render for large datasets (> 30 items) to prevent UI thread freezing
  const [renderedCount, setRenderedCount] = useState(() =>
    orders.length > 40 ? 30 : orders.length,
  );

  useEffect(() => {
    setRenderedCount(orders.length > 40 ? 30 : orders.length);
  }, [orders]);

  useEffect(() => {
    if (renderedCount < orders.length) {
      const handle = requestAnimationFrame(() => {
        setRenderedCount((prev) => Math.min(prev + 40, orders.length));
      });
      return () => cancelAnimationFrame(handle);
    }
  }, [renderedCount, orders.length]);

  const visibleOrders = orders.slice(0, renderedCount);

  function toggleOne(id: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    onSelectionChange(next);
  }

  if (isLoading || (orders.length === 0 && isFetching)) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/80 bg-background/30 py-16 text-center backdrop-blur-2xs">
        <SearchXIcon className="size-8 text-muted-foreground/60" />
        <p className="font-medium">Tidak ada pesanan</p>
        <p className="text-sm text-muted-foreground">
          Coba ubah tab status, kata kunci pencarian, atau filter toko.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-4">
      {/* Floating Fetching Pill */}
      {isFetching && !isLoading && (
        <div className="sticky top-2 z-20 -mb-8 flex justify-center pointer-events-none">
          <div className="inline-flex items-center gap-2 rounded-full bg-background/95 px-3.5 py-1.5 text-xs font-medium text-foreground shadow-lg border border-primary/30 backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-200">
            <Loader2Icon className="size-3.5 animate-spin text-primary shrink-0" />
            <span>Memperbarui data pesanan...</span>
          </div>
        </div>
      )}

      {/* Cards List with smooth opacity fade during background fetch */}
      <div
        className={cn(
          "flex flex-col gap-3",
          isFetching && "opacity-60 pointer-events-none",
        )}
      >
        {visibleOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            tab={tab}
            subFilter={subFilter}
            selected={selectable ? selectedIds.has(order.id) : undefined}
            onSelectedChange={
              selectable ? (v) => toggleOne(order.id, !!v) : undefined
            }
          />
        ))}
      </div>

      <SimplePagination
        page={page}
        lastPage={lastPage}
        onPageChange={onPageChange}
        perPage={perPage}
        onPerPageChange={onPerPageChange}
        pageSizeOptions={TABLE_PAGE_SIZES}
        isFetching={isFetching}
        label="pesanan"
        total={total}
      />
    </div>
  );
}
