"use client";

import { useMemo, useState } from "react";
import { Loader2Icon, StoreIcon } from "lucide-react";

import { Combobox } from "@/components/ui/combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  SimplePagination,
  TABLE_PAGE_SIZES,
} from "@/components/ui/simple-pagination";
import { ChannelLogo } from "@/components/dashboard/integrasi-channel/channel-logo";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import {
  useStockAllocationStores,
  useUpdateStockAllocation,
  type StockAllocationParams,
} from "@/hooks/channel/use-stock-allocation";
import type { StockAllocationStore, StockSourceMode } from "@/types/channel";
import { usePermissions } from "@/hooks/auth/use-permissions";

function StockAllocationRow({
  store,
  params,
  canEdit,
}: {
  store: StockAllocationStore;
  params: StockAllocationParams;
  canEdit: boolean;
}) {
  const updateMut = useUpdateStockAllocation(params);
  const { data: locData, isLoading: locLoading } = useLocations({
    perPage: 100,
  });

  const [mode, setMode] = useState<StockSourceMode>(store.stockSourceMode);
  const [locationId, setLocationId] = useState<string | null>(store.locationId);
  const [synced, setSynced] = useState({
    mode: store.stockSourceMode,
    locationId: store.locationId,
  });

  if (
    synced.mode !== store.stockSourceMode ||
    synced.locationId !== store.locationId
  ) {
    setSynced({ mode: store.stockSourceMode, locationId: store.locationId });
    setMode(store.stockSourceMode);
    setLocationId(store.locationId);
  }

  const locationOptions = useMemo(
    () =>
      (locData?.items ?? [])
        .filter((l) => l.isWarehouse)
        .map((l) => ({ value: l.id, label: l.locationName })),
    [locData],
  );

  const handleModeChange = (value: string) => {
    const next = value as StockSourceMode;
    setMode(next);

    if (next === "total") {
      updateMut.mutate({ storeId: store.storeId, stockSourceMode: "total" });
      return;
    }

    if (locationId) {
      updateMut.mutate({
        storeId: store.storeId,
        stockSourceMode: "location",
        locationId,
      });
    }
  };

  const handleLocationChange = (value: string | null) => {
    setLocationId(value);
    if (!value) return;

    updateMut.mutate({
      storeId: store.storeId,
      stockSourceMode: "location",
      locationId: value,
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <ChannelLogo
          code={store.channelCode}
          name={store.channelName}
          className="size-8 rounded-xl"
        />
        <span className="truncate text-sm font-medium">{store.storeName}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!canEdit ? (
          <span className="text-sm text-muted-foreground">
            {mode === "location" ? "Lokasi stok" : "Stok total"}
          </span>
        ) : (
          <>
            <RadioGroup
              value={mode}
              onValueChange={handleModeChange}
              className="flex w-auto flex-row items-center gap-4"
            >
              <label
                htmlFor={`total-${store.storeId}`}
                className="flex cursor-pointer items-center gap-1.5 text-sm"
              >
                <RadioGroupItem id={`total-${store.storeId}`} value="total" />
                Stok Total
              </label>
              <label
                htmlFor={`location-${store.storeId}`}
                className="flex cursor-pointer items-center gap-1.5 text-sm"
              >
                <RadioGroupItem
                  id={`location-${store.storeId}`}
                  value="location"
                />
                Lokasi Stok
              </label>
            </RadioGroup>

            {mode === "location" && (
              <Combobox
                options={locationOptions}
                value={locationId}
                onChange={handleLocationChange}
                placeholder="Pilih gudang…"
                searchPlaceholder="Cari gudang…"
                loading={locLoading}
                className="w-56"
              />
            )}

            {updateMut.isPending && (
              <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function StockAllocationList() {
  const { can } = usePermissions();
  const canEdit = can("edit-posisi-stok");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const params = useMemo<StockAllocationParams>(
    () => ({ page, perPage }),
    [page, perPage],
  );

  const { data, isLoading, isFetching } = useStockAllocationStores(params);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2Icon className="size-5 animate-spin" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={StoreIcon}
        title="Belum ada toko terhubung"
        description="Hubungkan toko marketplace dulu di halaman Integrasi Channel."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="flex flex-col divide-y divide-border/60 px-5 py-2">
          {data.items.map((store) => (
            <StockAllocationRow
              key={store.storeId}
              store={store}
              params={params}
              canEdit={canEdit}
            />
          ))}
        </div>
      </LiquidGlass>

      <SimplePagination
        page={data.meta.current_page}
        lastPage={data.meta.last_page}
        onPageChange={setPage}
        perPage={data.meta.per_page}
        onPerPageChange={(size) => {
          setPerPage(size);
          setPage(1);
        }}
        pageSizeOptions={TABLE_PAGE_SIZES}
        isFetching={isFetching}
        total={data.meta.total}
        label="toko"
      />
    </div>
  );
}
