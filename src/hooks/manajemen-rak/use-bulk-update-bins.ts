"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LocationService } from "@/services/manajemen-rak/location.service";
import { locationKeys } from "@/hooks/manajemen-rak/use-locations";

interface BulkUpdateBin {
  id: string;
  bin_final_code: string;
  is_stock_acknowledged: boolean;
  is_large_bin: boolean;
}

export function useBulkUpdateBins(locationId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (bins: BulkUpdateBin[]) => {
      if (!locationId) throw new Error("locationId is required");
      return LocationService.patchBins(locationId, bins);
    },
    onSuccess: () => {
      if (locationId) {
        qc.invalidateQueries({ queryKey: locationKeys.detail(locationId) });
      }
    },
  });
}
