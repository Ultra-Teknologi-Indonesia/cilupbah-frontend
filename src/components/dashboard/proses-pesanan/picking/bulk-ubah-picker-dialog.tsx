"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserSelectById } from "@/components/dashboard/shared/user-select-by-id";
import { useMe } from "@/hooks/auth/use-auth";
import {
  useBulkAssignPicker,
  usePickers,
} from "@/hooks/proses-pesanan/use-fulfillment";
import { apiError } from "@/lib/toast";

interface BulkUbahPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  picklistIds: string[];
  locationId: string | null;
}

export function BulkUbahPickerDialog({
  open,
  onOpenChange,
  picklistIds,
  locationId,
}: BulkUbahPickerDialogProps) {
  const [pickerId, setPickerId] = React.useState("");
  const pickers = usePickers(locationId ?? undefined, undefined, open);
  const { data: me } = useMe();
  const assignPicker = useBulkAssignPicker();

  const pickerOptions = React.useMemo(
    () =>
      (pickers.data ?? []).map((picker) => ({
        id: picker.id,
        name: picker.name,
      })),
    [pickers.data],
  );

  const handleSubmit = async () => {
    if (!pickerId || picklistIds.length === 0) return;

    try {
      const result = await assignPicker.mutateAsync({
        picklistIds,
        pickerId,
      });

      if (result.failed_count > 0) {
        toast.warning("Sebagian picker tidak berubah", {
          description: `${result.success_count} berhasil, ${result.failed_count} gagal.`,
        });
      } else {
        toast.success(`${result.success_count} picklist berhasil diubah pickernya.`);
      }
      onOpenChange(false);
    } catch (error) {
      apiError(error, "Gagal mengubah picker.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ubah Picker</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm">
            {picklistIds.length} picklist dipilih
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-assign-picker">Picker baru</Label>
            <UserSelectById
              id="bulk-assign-picker"
              value={pickerId}
              onChange={setPickerId}
              options={pickerOptions}
              isLoading={pickers.isLoading}
              currentUserId={me?.id}
              placeholder="— Pilih picker —"
              emptyText="Tidak ada picker di lokasi ini."
              disabled={pickers.isLoading || !locationId}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignPicker.isPending}
          >
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSubmit()}
            disabled={!pickerId || assignPicker.isPending || !locationId}
          >
            {assignPicker.isPending && <Loader2Icon className="animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
