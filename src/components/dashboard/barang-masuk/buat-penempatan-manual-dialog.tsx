"use client";

import { useState, useMemo, useCallback } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { useInfiniteUserLookup } from "@/hooks/pengaturan/use-users";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { fetchClient } from "@/lib/api-client";
import { toast } from "sonner";
import { apiError } from "@/lib/toast";
import type { Inbound } from "@/types/barang-masuk/inbound";

interface BuatPenempatanManualDialogProps {
  inbounds: Inbound[];
  open: boolean;
  onOpenChange: (open: boolean) => void;

  onSuccess?: (data?: unknown) => void;
}

export function BuatPenempatanManualDialog({
  inbounds,
  open,
  onOpenChange,
  onSuccess,
}: BuatPenempatanManualDialogProps) {
  const queryClient = useQueryClient();
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const debouncedStaffSearch = useDebouncedValue(staffSearch, 250);

  const { totalSku, totalQty } = useMemo(() => {
    const skuSet = new Set<string>();
    let qty = 0;
    for (const inbound of inbounds) {
      for (const item of inbound.items ?? []) {
        const availableQty = item.received_qty || 0;
        const pending = Math.max(
          0,
          availableQty - (item.putaway_qty || 0) - (item.reserved_qty || 0),
        );
        if (pending <= 0) continue;
        skuSet.add(item.item_id);
        qty += pending;
      }
    }
    return { totalSku: skuSet.size, totalQty: qty };
  }, [inbounds]);

  const locationIds = useMemo(
    () => [
      ...new Set(
        inbounds.map((inbound) => inbound.location_id).filter(Boolean),
      ),
    ],
    [inbounds],
  );
  const assignmentLocationId =
    locationIds.length === 1 ? locationIds[0] : undefined;

  const staffLookup = useInfiniteUserLookup(
    {
      q: debouncedStaffSearch || undefined,
      perPage: 20,
      locationId: assignmentLocationId,
      permission: "edit-penempatan",
    },
    open && !!assignmentLocationId,
  );

  const {
    data: staffData,
    isLoading: staffLoading,
    isFetching: staffFetching,
    hasNextPage: hasMoreStaff,
    isFetchingNextPage: fetchingMoreStaff,
    fetchNextPage: fetchMoreStaff,
  } = staffLookup;

  const staffOptions = useMemo(() => {
    const options = staffData?.pages.flatMap((page) => page.items) ?? [];
    const unique = new Map(options.map((user) => [user.id, user]));

    return [...unique.values()].map((user) => ({
      value: user.id,
      label: user.name,
    }));
  }, [staffData]);

  const handleStaffQueryChange = useCallback((query: string) => {
    setStaffSearch(query);
  }, []);

  const handleLoadMoreStaff = useCallback(() => {
    if (hasMoreStaff && !fetchingMoreStaff) {
      void fetchMoreStaff();
    }
  }, [fetchMoreStaff, fetchingMoreStaff, hasMoreStaff]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (inbounds.length === 0) throw new Error("Pilih minimal 1 penerimaan");
      const res = await fetchClient<{ data: unknown; error?: string }>(
        `/putaway`,
        {
          method: "POST",
          data: {
            inbound_ids: inbounds.map((i) => i.id),
            assigned_to: assignedTo || undefined,
            notes: notes || undefined,
          },
        },
      );
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Dokumen penempatan berhasil dibuat");
      queryClient.invalidateQueries({ queryKey: ["putaway"] });
      queryClient.invalidateQueries({ queryKey: ["inbound"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order"] });
      onOpenChange(false);
      setAssignedTo("");
      setNotes("");
      onSuccess?.(data);
    },
    onError: (error) => {
      apiError(error, "Gagal membuat penempatan");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {inbounds.length > 1
              ? `Penempatan Gabungan (${inbounds.length} penerimaan)`
              : "Penempatan Manual"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-4">
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Penerimaan
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {inbounds.map((i) => (
                <Badge key={i.id} variant="secondary">
                  {i.transaction_number}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <Label className="text-sm font-medium text-muted-foreground">
              Total SKU
            </Label>
            <Input
              value={totalSku}
              disabled
              className="bg-white/50 dark:bg-white/[0.02]"
            />
          </div>

          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <Label className="text-sm font-medium text-muted-foreground">
              Total Qty
            </Label>
            <Input
              value={totalQty}
              disabled
              className="bg-white/50 dark:bg-white/[0.02]"
            />
          </div>

          <div className="grid grid-cols-[120px_1fr] items-center gap-4">
            <Label className="text-sm font-medium text-muted-foreground">
              Tugaskan Ke
            </Label>
            <Combobox
              options={staffOptions}
              value={assignedTo}
              onChange={(v) => setAssignedTo(v ?? "")}
              placeholder={
                !assignmentLocationId
                  ? "Lokasi penerimaan tidak sama"
                  : "Pilih pengguna..."
              }
              searchPlaceholder="Cari pengguna..."
              className="w-full"
              disabled={!assignmentLocationId}
              loading={staffLoading || staffFetching}
              onQueryChange={handleStaffQueryChange}
              onLoadMore={handleLoadMoreStaff}
              hasMore={hasMoreStaff}
              loadingMore={fetchingMoreStaff}
            />
          </div>

          <div className="grid grid-cols-[120px_1fr] items-start gap-4">
            <Label className="mt-2 text-sm font-medium text-muted-foreground">
              Keterangan
            </Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan penempatan... (opsional)"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending || !assignedTo || inbounds.length === 0
            }
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {mutation.isPending && (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            )}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
