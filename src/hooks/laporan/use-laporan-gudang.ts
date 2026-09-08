"use client";

import { useQuery } from "@tanstack/react-query";

import { useAsyncExport } from "@/hooks/laporan/use-async-export";
import { LaporanGudangService } from "@/services/laporan/laporan-gudang.service";
import type {
  OrderPerformanceParams,
  PicklistDetailPdfParams,
  PicklistExportParams,
  PutawayListParams,
  PutawayPerformanceParams,
  ShipmentByCourierParams,
  ShipmentExportParams,
  TransferReportParams,
} from "@/types/laporan/laporan-gudang";

export function useExportTransferReport() {
  return useAsyncExport((params: TransferReportParams) =>
    LaporanGudangService.exportTransferAsync(params),
  );
}

export function useExportPicklistReport() {
  return useAsyncExport((params: PicklistExportParams) =>
    LaporanGudangService.exportPicklistAsync(params),
  );
}

export function useExportShipmentList() {
  return useAsyncExport((params: ShipmentExportParams) =>
    LaporanGudangService.exportShipmentListAsync(params),
  );
}

export function useExportOrderPerformance() {
  return useAsyncExport((params: OrderPerformanceParams) =>
    LaporanGudangService.exportOrderPerformanceAsync(params),
  );
}

export function useExportPutawayPerformance() {
  return useAsyncExport((params: PutawayPerformanceParams) =>
    LaporanGudangService.exportPutawayPerformanceAsync(params),
  );
}

export function useExportPutawayList() {
  return useAsyncExport((params: PutawayListParams) =>
    LaporanGudangService.exportPutawayListAsync(params),
  );
}

export function useExportShipmentByCourier() {
  return useAsyncExport((params: ShipmentByCourierParams) =>
    LaporanGudangService.exportShipmentByCourierAsync(params),
  );
}

export function useExportPicklistDetail() {
  return useAsyncExport((params: PicklistDetailPdfParams) =>
    LaporanGudangService.exportPicklistDetailAsync(params),
  );
}

export function useExportPicklistDetailPdf() {
  return useAsyncExport((params: PicklistDetailPdfParams) =>
    LaporanGudangService.exportPicklistDetailPdfAsync(params),
  );
}

export function useShipmentFilterOptions(enabled = true) {
  return useQuery({
    queryKey: ["laporan", "gudang", "shipment-options"],
    queryFn: () => LaporanGudangService.shipmentFilterOptions(),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function usePutawayNumbers(
  date: string,
  locationId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["laporan", "gudang", "putaway-numbers", date, locationId],
    queryFn: () => LaporanGudangService.searchPutawayNumbers(date, locationId),
    staleTime: 30_000,
    enabled: enabled && Boolean(date && locationId),
  });
}

export function usePicklistSearch(search: string, enabled = true) {
  return useQuery({
    queryKey: ["laporan", "gudang", "picklist-lookup", search],
    queryFn: () => LaporanGudangService.searchPicklists(search),
    staleTime: 30_000,
    enabled,
  });
}
