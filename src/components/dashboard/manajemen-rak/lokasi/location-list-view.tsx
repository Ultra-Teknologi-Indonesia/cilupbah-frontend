"use client";

import * as React from "react";
import Link from "next/link";
import { InfoIcon, Loader2Icon, PlusIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SimplePagination } from "@/components/ui/simple-pagination";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import { useDeleteLocation } from "@/hooks/manajemen-rak/use-delete-location";
import { useToggleLocationActive } from "@/hooks/manajemen-rak/use-toggle-location-active";
import {
  useWarehouseLayoutSetting,
  useSaveWarehouseLayoutSetting,
} from "@/hooks/manajemen-rak/use-warehouse-layout-setting";
import { useListState } from "@/hooks/use-list-state";
import type { Location } from "@/types/manajemen-rak/location";
import { apiError } from "@/lib/toast";
import { usePermissions } from "@/hooks/auth/use-permissions";

import { LocationTable } from "./location-table";
import { DeleteLocationDialog } from "./delete-location-dialog";

export function LocationListView() {
  const { can } = usePermissions();
  const canCreateLocation = can("create-manajemen-rak");
  const canViewLocation = can("view-manajemen-rak");
  const canEditLocation = can("edit-manajemen-rak");
  const canDeleteLocation = can("delete-manajemen-rak");
  const canViewSystemSettings = can("view-pengaturan-sistem");
  const canEditSystemSettings = can("edit-pengaturan-sistem");
  const list = useListState<Record<string, never>>(
    {},
    { perPage: 20, debounceMs: 350, namespace: "lokasi" },
  );
  const [deleteTarget, setDeleteTarget] = React.useState<Location | null>(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  const { data, isLoading, isError, isFetching } = useLocations({
    search: list.debouncedSearch,
    page: list.page,
    perPage: list.perPage,
    excludeTransit: false,
  });
  const setting = useWarehouseLayoutSetting(canViewSystemSettings);
  const saveSetting = useSaveWarehouseLayoutSetting();
  const deleteLocation = useDeleteLocation();
  const toggleActive = useToggleLocationActive();

  const locations = data?.items ?? [];
  const total = data?.meta?.total ?? locations.length;
  const currentPage = data?.meta?.current_page ?? list.page;
  const lastPage = data?.meta?.last_page ?? 1;

  function handleToggleActive(location: Location) {
    setTogglingId(location.id);
    toggleActive.mutate(
      { id: location.id, isActive: !location.isActive },
      {
        onError: (err) => apiError(err, "Gagal mengubah status aktif."),
        onSettled: () => setTogglingId(null),
      },
    );
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteLocation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Lokasi berhasil dihapus.");
        setDeleteTarget(null);
      },
      onError: (err) => apiError(err, "Gagal menghapus lokasi."),
    });
  }

  function handleToggleLayout(checked: boolean) {
    saveSetting.mutate(checked, {
      onSuccess: () =>
        toast.success(
          checked
            ? "Layout gudang diaktifkan."
            : "Layout gudang dinonaktifkan.",
        ),
      onError: (err) => apiError(err, "Gagal menyimpan pengaturan."),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <LiquidGlass radius={24} className="bg-white/40 dark:bg-white/[0.06]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Gunakan Layout Gudang</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="size-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  Saat aktif, gudang dapat diatur layout rak
                  (lantai/baris/kolom/rak).
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {canViewSystemSettings && (
              <Switch
                checked={setting.data?.useWarehouseLayout ?? false}
                disabled={
                  !canEditSystemSettings ||
                  setting.isLoading ||
                  saveSetting.isPending
                }
                onCheckedChange={handleToggleLayout}
                aria-label="Gunakan layout gudang"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={list.search}
                onChange={(e) => list.setSearch(e.target.value)}
                placeholder="Cari lokasi"
                className="pl-9"
              />
            </div>
            {canCreateLocation && (
              <Button variant="primary" asChild>
                <Link href="/dashboard/lokasi/buat">
                  <PlusIcon />
                  Buat Lokasi
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end px-5 py-3 text-sm text-muted-foreground">
          Total <Badge className="ml-2">{total}</Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-destructive">
            Gagal memuat data lokasi.
          </div>
        ) : locations.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Belum ada lokasi.
          </div>
        ) : (
          <LocationTable
            locations={locations}
            togglingId={togglingId}
            onToggleActive={handleToggleActive}
            onDelete={(loc) => setDeleteTarget(loc)}
            canView={canViewLocation}
            canEdit={canEditLocation}
            canDelete={canDeleteLocation}
          />
        )}

        {!isLoading && !isError && (
          <div className="px-5 pb-3">
            <SimplePagination
              page={currentPage}
              lastPage={lastPage}
              onPageChange={list.setPage}
              total={total}
              label="lokasi"
              isFetching={isFetching}
            />
          </div>
        )}
      </LiquidGlass>

      <DeleteLocationDialog
        location={deleteTarget}
        open={Boolean(deleteTarget)}
        loading={deleteLocation.isPending}
        onOpenChange={(open) => {
          if (!open && !deleteLocation.isPending) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
